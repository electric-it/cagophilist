package aws

import (
	"fmt"
	"os"
	"sort"
	"time"

	"github.com/go-ini/ini"
	home "github.com/monochromegane/go-home"

	"github.com/pkg/errors"

	"github.com/apex/log"
)

var credentialsFilePath = home.Dir() + string(os.PathSeparator) + ".aws" + string(os.PathSeparator)

// CredentialsFileLocation The location of the credentials file
var CredentialsFileLocation = credentialsFilePath + "credentials"

// CagoManagedKey The key in the credentials file indicating the profile is managed by Cago
var CagoManagedKey = "cago_managed"

// GetProfileKey returns the value for the specified profile and key
func GetProfileKey(profileName string, keyName string) (string, error) {
	credentialsFile, err := GetCredentialsFile()
	if err != nil {
		log.Errorf("Unable to retrieve credentials file: %s", err)
		os.Exit(1)
	}

	log.Debugf("Getting section: %s", profileName)
	section, err := credentialsFile.GetSection(profileName)
	if err != nil {
		err = errors.Wrap(err, fmt.Sprintf("Unable to find profile: %s", profileName))
		return "", err
	}

	keyValue, err := section.GetKey(keyName)
	if err != nil {
		err = errors.Wrap(err, fmt.Sprintf("Unable to find key (%s) in profile: %s", keyName, profileName))
		return "", err
	}

	return keyValue.String(), nil
}

// HasProfileExpired returns whether the specified profile has expired or not
func HasProfileExpired(section *ini.Section) bool {
	if !section.HasKey("expire") {
		// No expiration key, assume it has expired
		return true
	}

	expiration, err := section.Key("expire").Time()
	if err != nil {
		// Can't parse it, delete it
		section.DeleteKey("expire")
		return true
	}

	if time.Now().After(expiration) {
		// The time right now is after the expiration time
		return true
	}

	// Key exists and is still valid
	return false
}

// GetAllManagedProfileNames returns a list of the names of all managed profiles
func GetAllManagedProfileNames() []string {
	credentialsFile, err := GetCredentialsFile()
	if err != nil {
		log.Errorf("Unable to retrieve credentials file: %s", err)
		os.Exit(1)
	}

	// Grab a list of all the sections in the credentials file
	allProfiles := credentialsFile.Sections()
	var profileNames []string
	for _, profile := range allProfiles {
		// Check to see if this is a profile that we're managing
		if profile.HasKey(CagoManagedKey) {
			log.Debugf("Profile %s is managed", profile.Name())

			profileNames = append(profileNames, profile.Name())
		} else {
			log.Debugf("Profile %s is not managed, skipping", profile.Name())
		}
	}

	sort.Strings(profileNames)

	return profileNames
}

// HasManagedProfiles returns true if there are managed profiles in the credentials file; false otherwise
func HasManagedProfiles() bool {
	managedProfiles := GetAllManagedProfileNames()

	return len(managedProfiles) > 0
}

// GetCredentialsFile Returns the credentials file, creates a new empty file if it does not already exist
func GetCredentialsFile() (credentialsFile *ini.File, err error) {
	// Check to see if a credential file already exists
	if _, err := os.Stat(CredentialsFileLocation); err == nil {
		// If so, load it
		log.Debugf("Loading credentials file: %s", CredentialsFileLocation)
		credentialsFile, err = ini.Load(CredentialsFileLocation)
		if err != nil {
			return nil, errors.Wrap(err, fmt.Sprintf("Unable to load credentials file: %s", CredentialsFileLocation))
		}
	} else {
		// If not, create it
		log.Debugf("Credentials file not found, creating empty file: %s", CredentialsFileLocation)
		mkdirError := os.MkdirAll(credentialsFilePath, 0600)
		if mkdirError != nil {
			return nil, errors.Wrap(mkdirError, fmt.Sprintf("Unable to create directory: %s", credentialsFilePath))
		}

		log.Debugf("Creating new credentials file: %s", CredentialsFileLocation)
		rawCredentialsFile, createError := os.Create(CredentialsFileLocation)
		if createError != nil {
			return nil, errors.Wrap(createError, fmt.Sprintf("Unable to create empty credentials file: %s", CredentialsFileLocation))
		}

		log.Debugf("Closing new credentials file: %s", CredentialsFileLocation)
		closeError := rawCredentialsFile.Close()
		if closeError != nil {
			return nil, errors.Wrap(closeError, fmt.Sprintf("Unable to close new credentials file: %s", CredentialsFileLocation))
		}

		log.Debugf("Saving empty credentials file: %s", CredentialsFileLocation)
		credentialsFile = ini.Empty()
		saveError := credentialsFile.SaveTo(CredentialsFileLocation)
		if saveError != nil {
			return nil, errors.Wrap(saveError, fmt.Sprintf("Unable to save credentials file: %s", CredentialsFileLocation))
		}
	}

	return credentialsFile, nil
}
