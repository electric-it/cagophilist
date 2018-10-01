package cmd // import "electric-it.io/cago"

import (
	"encoding/base64"
	"strings"
	"time"

	"github.com/apex/log"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/sts"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	funk "github.com/thoas/go-funk"

	"electric-it.io/cago/aws"
	"electric-it.io/cago/net"
	"electric-it.io/cago/saml"
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
		forceRefreshFlag := viper.GetBool(forceRefreshFlagLong)

		// Before anything, make sure the STS endpoint is accessible
		if !canAccessSTSEndpoint() {
			log.Fatal("Unable to access STS endpoint!")
		}

		// Get a SAML assertion that we can use with the STS
		samlAssertionBase64, samlAssertionErr := saml.GetSAMLAssertionBase64()
		if samlAssertionErr != nil {
			log.Fatalf("Unable to get SAML assertion: %s", samlAssertionErr)
		}

		log.Debug("Retrieved SAML assertion from IdP:")
		samlAssertion, err := base64.StdEncoding.DecodeString(samlAssertionBase64)
		if err != nil {
			log.Errorf("Error decoding SAML assertion: %s", err)
		}
		log.Debug(string(samlAssertion))

		// Grab the list of authorized roles from the IdP
		authorizedRoles, rolesErr := saml.GetAuthorizedRoles(samlAssertionBase64)
		if rolesErr != nil {
			log.Fatalf("Unable to get authorized roles: %s", rolesErr)
		}

		if len(authorizedRoles) == 0 {
			log.Warn("The SAML assertion returned from the IdP does not contain any authorized roles, so no profiles will be created")
		} else {
			log.Debugf("Found %d authorized roles in SAML assertion returned from IdP.", len(authorizedRoles))
		}

		// First, let's make a map of roles to profile names that should exist based on the authorized role list
		authorizedProfileAndRoles := map[string]*aws.Role{}
		for _, awsRole := range authorizedRoles {
			// Translate the AWS role into a profile name and map it to the role
			profileName := translateRoleToProfileName(awsRole)
			authorizedProfileAndRoles[profileName] = awsRole
		}

		// Then, let's remove any profiles that are no longer authorized
		existingProfileNames, getAllManagedProfileNamesError := aws.GetAllManagedProfileNames()
		if getAllManagedProfileNamesError != nil {
			log.Fatal("Cago was unable to get the list of profile names")
		}

		for _, profileName := range existingProfileNames {
			if !funk.Contains(authorizedProfileAndRoles, profileName) {
				// Found a profile that is no longer authorized
				log.Infof("Removing profile (%s) as it no longer maps to an authorized role", profileName)

				deleteProfileError := aws.DeleteProfile(profileName)
				if deleteProfileError != nil {
					log.Fatalf("Unable to delete profile (%v): %+v", profileName, errors.WithStack(deleteProfileError))
				}
			}
		}

		// Then, update each authorized profile
		for profileName, awsRole := range authorizedProfileAndRoles {
			log.Debugf("Processing profile: %v", profileName)

			// Check to see if the profile already exists
			profileExists, doesProfileExistError := aws.DoesProfileExist(profileName)
			if doesProfileExistError != nil {
				log.Fatalf("Cago cannot determine if the following profile exists: %v", profileName)
			}

			// Determine if the profile is expired or not; will be false if the profile doesn't exist
			profileIsExpired, isExpiredError := aws.IsExpired(profileName)
			if isExpiredError != nil {
				log.Warnf("Cago cannot determine if the following profile is expired, Cago will assume it is: %v", profileName)

				profileIsExpired = false
			}

			// Refresh the profile if it doesn't yet exist, it has expired or if the force refresh flag was set
			log.Debugf("Profile %v: Exists(%t) Expired(%t) ForceRefresh(%t)", profileName, profileExists, profileIsExpired, forceRefreshFlag)
			if forceRefreshFlag || !profileExists || profileIsExpired {
				if profileExists {
					// If we're going to refresh the profile, delete it first and create it fresh
					log.Debugf("Deleting profile %v in prepration to refresh", profileName)

					deleteProfileError := aws.DeleteProfile(profileName)
					if deleteProfileError != nil {
						log.Fatalf("Unable to delete profile (%v): %+v", profileName, errors.WithStack(deleteProfileError))
					}
				}

				log.Debugf("Assuming role (%s) with principal (%s)", awsRole.RoleARN, awsRole.PrincipalARN)
				assumeRoleOutput, assumeRoleError := assumeRole(awsRole, samlAssertionBase64)
				if assumeRoleError != nil {
					log.Fatalf("Error assuming role (%v) with principal (%v): %+v", awsRole.RoleARN, awsRole.PrincipalARN, errors.WithStack(assumeRoleError))
				}

				log.Debugf("Successfully assumed the role: %s", awsRole.RoleARN)

				// Create a fresh new profile
				addProfileError := aws.AddProfile(profileName)
				if addProfileError != nil {
					log.Fatalf("Error creating new profile %v\n%+v", profileName, errors.WithStack(addProfileError))
				}

				// Store the role credentials in the profile section
				addAccessKeyValueError := aws.AddKeyValue(profileName, "aws_access_key_id", *assumeRoleOutput.Credentials.AccessKeyId)
				if addAccessKeyValueError != nil {
					log.Fatalf("Error creating new key in profile %s:\n%+v", profileName, errors.WithStack(addAccessKeyValueError))
				}

				addSecretKeyValueError := aws.AddKeyValue(profileName, "aws_secret_access_key", *assumeRoleOutput.Credentials.SecretAccessKey)
				if addSecretKeyValueError != nil {
					log.Fatalf("Error creating new key in profile %s:\n%+v", profileName, errors.WithStack(addSecretKeyValueError))
				}

				addSessionKeyValueError := aws.AddKeyValue(profileName, "aws_session_token", *assumeRoleOutput.Credentials.SessionToken)
				if addSessionKeyValueError != nil {
					log.Fatalf("Error creating new key in profile %s:\n%+v", profileName, errors.WithStack(addSessionKeyValueError))
				}

				addExpirationKeyValueError := aws.AddKeyValue(profileName, aws.ExpirationKeyName, assumeRoleOutput.Credentials.Expiration.Format(time.RFC3339))
				if addExpirationKeyValueError != nil {
					log.Fatalf("Error creating new key in profile %s:\n%+v", profileName, errors.WithStack(addExpirationKeyValueError))
				}

				addCagoKeyValueError := aws.AddKeyValue(profileName, aws.CagoManagedKeyName, "true")
				if addCagoKeyValueError != nil {
					log.Fatalf("Error creating new key in profile %s:\n%+v", profileName, errors.WithStack(addCagoKeyValueError))
				}

				// Add any additional key/value pairs from the configuration file to the profile
				addAdditionalProfileConfiguration(profileName, awsRole)
			} else {
				// The profile is valid and hasn't expired
				log.Debugf("Skipping non-expired profile: %s", profileName)
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

func assumeRole(awsRole *aws.Role, samlAssertionBase64 string) (*sts.AssumeRoleWithSAMLOutput, error) {
	sess := session.Must(session.NewSession())
	svc := sts.New(sess)

	params := &sts.AssumeRoleWithSAMLInput{
		PrincipalArn:  &awsRole.PrincipalARN,
		RoleArn:       &awsRole.RoleARN,
		SAMLAssertion: &samlAssertionBase64,
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

	httpClient := net.GetHTTPClient()

	log.Debugf("Attempting a HEAD on STS endpoint: %s", "https://sts.amazonaws.com")

	_, headError := httpClient.Head("https://sts.amazonaws.com")
	if headError != nil {
		log.Errorf("Error attempting to reach STS endpoint: %s", headError)
		return false
	}

	log.Debug("Successfully reached STS endpoint")

	return true
}

// translateRoleToProfileName converts an array of SAML role names into the
func translateRoleToProfileName(awsRole *aws.Role) string {
	// Parse the ARN string
	roleARN, parseARNError := aws.ParseARN(awsRole.RoleARN)
	if parseARNError != nil {
		log.Fatalf("Unable to parse ARN %s\n%+v", awsRole.RoleARN, errors.WithStack(parseARNError))
	}

	// Parse out to the role name, remove the 'role' part for clarity
	roleName := strings.TrimPrefix(roleARN.Resource, "role")

	// The default profile name is the account id + rolename
	profileName := roleARN.Account + roleName

	// The Cago configuration file could have a section called 'Accounts.<Role Account>'
	accountSubTree := viper.Sub("Accounts." + roleARN.Account)
	if accountSubTree != nil {
		log.Debugf("Found configuration section for account under key: %s", "Accounts."+roleARN.Account)

		// Check to see if there's an alias
		accountAlias := accountSubTree.GetString("alias")
		if accountAlias != "" {
			// Use the alias from the configuration file instead of the account id
			profileName = accountAlias + roleName
		} else {
			// Notify user if no alias was provided for the account
			log.Warnf("The configuration file did not contain an alias for the account: %v", roleARN.Account)
		}
	} else {
		log.Warnf("The configuration file does not contain any configuration information for the account: %s", roleARN.Account)
	}

	return profileName
}

// addAdditionalProfileConfiguration adds all key/value pairs from the account section of the configuration file to the profile
func addAdditionalProfileConfiguration(profileName string, awsRole *aws.Role) {
	// Parse the ARN string
	roleARN, parseARNError := aws.ParseARN(awsRole.RoleARN)
	if parseARNError != nil {
		log.Fatalf("Unable to parse ARN %s\n%+v", awsRole.RoleARN, errors.WithStack(parseARNError))
	}

	// Grab the configuration section for the account, if it exists
	accountSubTree := viper.Sub("Accounts." + roleARN.Account)

	if accountSubTree != nil {
		// Add any additional metadata from the config file
		for _, configurationKey := range accountSubTree.AllKeys() {
			configurationValue := accountSubTree.GetString(configurationKey)

			log.Debugf("Found additional configuration key/value pair: %s/%s", configurationKey, configurationValue)

			addAdditionalKeyValueError := aws.AddKeyValue(profileName, configurationKey, configurationValue)
			if addAdditionalKeyValueError != nil {
				log.Fatalf("Error creating new key in profile %s:\n%+v", profileName, errors.WithStack(addAdditionalKeyValueError))
			}
		}
	}
}
