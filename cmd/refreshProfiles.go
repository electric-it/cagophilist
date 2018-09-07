package cmd

import (
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/sts"
	"github.com/spf13/viper"

	"github.com/go-ini/ini"
	"github.com/spf13/cobra"

	"github.com/electric-it/cagophilist/aws"
	"github.com/electric-it/cagophilist/lib"
	"github.com/electric-it/cagophilist/saml"

	"github.com/apex/log"
)

const (
	forceRefreshFlagLong  = "force-refresh"
	forceRefreshFlagShort = "f"
)

// refreshCmd represents the refresh command
var refreshProfilesCmd = &cobra.Command{
	Use:   "refresh-profiles",
	Short: "Update managed profiles to match authorized roles and refresh all tokens",
	Long:  ``,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Check for the forced refresh flag
		forceRefresh := viper.GetBool(forceRefreshFlagLong)

		// Only check for expired profiles if the user does not want to force a refresh and the credentials file is not new
		if !forceRefresh && aws.HasManagedProfiles() {
			log.Debugf("Did not detect %s flag, checking for expired profiles.", forceRefreshFlagLong)

			if !hasProfileExpired() {
				log.Info("All profiles are still valid... nothing to do!")
				os.Exit(0)
			} else {
				log.Debugf("Detected %s flag, forcing a refresh of all profiles.", forceRefreshFlagLong)
			}
		}

		// Before anything, make sure the STS endpoint is accessible
		if !canAccessSTSEndpoint() {
			log.Fatal("Unable to access STS endpoint!")
			os.Exit(1)
		}

		// Get a SAML assertion that we can use with the STS
		samlAssertion, samlAssertionErr := saml.GetSAMLAssertion()
		if samlAssertionErr != nil {
			log.Fatalf("Unable to get SAML assertion: %s", samlAssertionErr)
			os.Exit(1)
		}

		log.Debug("Retrieved SAML assertion from IdP")

		// Grab the list of authorized roles from the IdP
		authorizedRoles, rolesErr := saml.GetAuthorizedRoles(&samlAssertion)
		if rolesErr != nil {
			log.Fatalf("Unable to get authorized roles: %s", rolesErr)
			os.Exit(1)
		}

		log.Debug("Parsed authorized roles from SAML assertion")

		// Build a map of profile names to profiles
		validProfiles := make(map[string]*ini.Section)

		// Iterate through each authorized role and update the credentials file
		var credentialsFile, getFileError = aws.GetCredentialsFile()
		if getFileError != nil {
			log.Fatalf("Unable to get credentials file: %s", getFileError)
			os.Exit(1)
		}

		log.Debug("Updating credentials file with authorized roles from IdP")

		for _, role := range authorizedRoles {
			// Parse out the ARN string
			parsedARN, parseErr := lib.ParseARN(role.RoleARN)
			if parseErr != nil {
				log.Fatalf("Unable to parse %s: %s", role.RoleARN, parseErr)
				os.Exit(1)
			}

			// Trim the common part from the role ARN
			roleName := strings.TrimPrefix(parsedARN.Resource, "role")

			// The default profile name is the account id + rolename
			profileName := parsedARN.Account + roleName

			log.Debugf("Processing profile: %s", profileName)

			// This is the configuration file key for the account metadata
			accountConfigurationKey := "Accounts." + parsedARN.Account
			accountSubTree := viper.Sub(accountConfigurationKey)
			if accountSubTree != nil {
				log.Debugf("Found account subtree in configuration file under key: %s", accountConfigurationKey)

				// Check to see if there's an alias
				alias := accountSubTree.GetString("alias")

				if alias != "" {
					// Use the alias from the configuration file instead of the account id
					profileName = alias + roleName
				} else {
					// Alias was provided for account number
					log.Warnf("No alias mapped for account: %s", parsedARN.Account)
				}
			} else {
				log.Warnf("Account configuration not found in configuration file under key: %s", accountConfigurationKey)
			}

			// Grab the profile if it already exists
			section, sectionErr := credentialsFile.GetSection(profileName)
			if sectionErr != nil {
				log.Debugf("Adding profile to credentials file: %s", profileName)

				// The profile didn't exist, so let's create it
				section, sectionErr = credentialsFile.NewSection(profileName)
				if sectionErr != nil {
					log.Fatalf("Error creating new profile %s: %s", profileName, sectionErr)
					os.Exit(1)
				}
			}

			if forceRefresh || aws.HasProfileExpired(section) {
				log.Debugf("Refreshing profile: %s", profileName)

				// Delete anything that was there to eliminate any kruft
				credentialsFile.DeleteSection(section.Name())

				log.Debugf("Assuming (%s) with principal (%s)", role.RoleARN, role.PrincipalARN)

				assumeRoleOutput, err := assumeRole(&role.PrincipalARN, &role.RoleARN, &samlAssertion)
				if err != nil {
					log.Errorf("Error assuming (%s) with principal (%s): %s", role.RoleARN, role.PrincipalARN, err)
				} else {
					log.Debugf("Successfully assumed the role: %s", role.RoleARN)

					// Create a fresh new section
					section, err = credentialsFile.NewSection(profileName)
					if err != nil {
						log.Fatalf("Error creating new profile %s: %s", profileName, err)
					}

					// Store the role credentials in the profile section
					roleCredentials := assumeRoleOutput.Credentials
					_, err = section.NewKey("aws_access_key_id", *roleCredentials.AccessKeyId)
					if err != nil {
						log.Fatalf("Error creating new key in profile %s: %s", profileName, err)
					}

					_, err = section.NewKey("aws_secret_access_key", *roleCredentials.SecretAccessKey)
					if err != nil {
						log.Fatalf("Error creating new key in profile %s: %s", profileName, err)
						os.Exit(1)
					}

					_, err = section.NewKey("aws_session_token", *roleCredentials.SessionToken)
					if err != nil {
						log.Fatalf("Error creating new key in profile %s: %s", profileName, err)
					}

					_, err = section.NewKey("expire", roleCredentials.Expiration.Format(time.RFC3339))
					if err != nil {
						log.Fatalf("Error creating new key in profile %s: %s", profileName, err)
					}

					_, err = section.NewKey(aws.CagoManagedKey, "true")
					if err != nil {
						log.Fatalf("Error creating new key in profile %s: %s", profileName, err)
					}

					// Add additional metadata from the config file
					if accountSubTree != nil {
						for _, configurationKey := range accountSubTree.AllKeys() {
							configurationValue := accountSubTree.GetString(configurationKey)

							log.Debugf("Found additional configuration key/value pair: %s/%s", configurationKey, configurationValue)
							_, err = section.NewKey(configurationKey, configurationValue)
							if err != nil {
								log.Fatalf("Error creating new key in profile %s: %s", profileName, err)
							}
						}
					}
				}

				// Save the changes to the file
				var saveError = credentialsFile.SaveTo(aws.CredentialsFileLocation)
				if saveError != nil {
					log.Fatalf("Error saving credentials file to %s: %s", aws.CredentialsFileLocation, saveError)
					os.Exit(1)
				}

				// All is well with this profile, so store it
				log.Infof("Fresh token retrieved for: %s", profileName)
				validProfiles[profileName] = section
			} else {
				// The profile is valid and hasn't expired
				log.Debugf("Skipping non-expired profile: %s", section.Name())
				validProfiles[profileName] = section
			}
		}

		// ========================================================================
		// Cleanup any Cago managed profiles that don't match authorized roles
		// ========================================================================
		// Grab a list of all the sections in the credentials file
		allProfiles := credentialsFile.Sections()
		for _, profile := range allProfiles {
			// Check to see if this is a profile that we're managing
			if profile.HasKey(aws.CagoManagedKey) {
				// Check to see if it's valid
				_, ok := validProfiles[profile.Name()]
				if !ok {
					// Clean it up if not
					log.Infof("Deleting profile (%s) as it doesn't map to a valid role", profile.Name())
					credentialsFile.DeleteSection(profile.Name())

					// Save the changes to the file
					var saveError = credentialsFile.SaveTo(aws.CredentialsFileLocation)
					if saveError != nil {
						log.Fatalf("Error saving credentials file to %s: %s", aws.CredentialsFileLocation, saveError)
						os.Exit(1)
					}
				}
			}
		}

		return nil
	},
}

func init() {
	refreshProfilesCmd.Flags().BoolP(forceRefreshFlagLong, forceRefreshFlagShort, false, "Force a refresh, even if all profiles are valid.")
	err := viper.BindPFlag(forceRefreshFlagLong, refreshProfilesCmd.Flags().Lookup(forceRefreshFlagLong))
	if err != nil {
		log.Fatalf("Error binding pflag %s: %s", forceRefreshFlagLong, err)
	}

	RootCmd.AddCommand(refreshProfilesCmd)
}

func assumeRole(principalArn *string, roleArn *string, SAMLAssertion *string) (*sts.AssumeRoleWithSAMLOutput, error) {
	sess := session.Must(session.NewSession())
	svc := sts.New(sess)

	params := &sts.AssumeRoleWithSAMLInput{
		PrincipalArn:  principalArn,
		RoleArn:       roleArn,
		SAMLAssertion: SAMLAssertion,
	}

	//  Don't fail here, simply return the error if there is one
	log.Debugf("Calling STS service (%s)", svc.Endpoint)

	resp, err := svc.AssumeRoleWithSAML(params)

	// Pretty-print the response data.
	log.Debug(resp.String())

	return resp, err
}

// canAccessSTSEndpoint checks to see whether the STS endpoint can be reached
func canAccessSTSEndpoint() bool {
	log.Debug("Checking access to STS endpoint")

	httpClient := lib.GetHTTPClient()

	log.Debugf("Attempting a HEAD on STS endpoint: %s", "https://sts.amazonaws.com")

	_, headError := httpClient.Head("https://sts.amazonaws.com")
	if headError != nil {
		log.Errorf("Error attempting to reach STS endpoint: %s", headError)
		return false
	}

	log.Debug("Successfully reached STS endpoint")

	return true
}

// hasProfileExpired returns true if at least one managed profile has expired; false otherwise
func hasProfileExpired() bool {
	// Grab the AWS credentials file
	var credentialsFile, getFileError = aws.GetCredentialsFile()
	if getFileError != nil {
		log.Fatalf("Unable to get credentials file: %s", getFileError)
		os.Exit(1)
	}

	allProfiles := credentialsFile.Sections()
	for _, profile := range allProfiles {
		// Check to see if this is a profile that we're managing
		if profile.HasKey(aws.CagoManagedKey) {
			// Found a managed profile
			if aws.HasProfileExpired(profile) {
				// Found an expired profile
				log.Debugf("Profile %s is expired", profile.Name())

				return true
			}

			log.Debugf("Profile %s is not expired", profile.Name())
		} else {
			log.Debugf("Profile %s is not managed, ignoring", profile.Name())
		}
	}

	// All managed profiles are valid
	return false
}
