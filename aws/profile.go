package aws // import "electric-it.io/cago"

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/go-ini/ini"
	home "github.com/monochromegane/go-home"

	"github.com/apex/log"

	"github.com/go-errors/errors"
)

const (
	// Permissions for the credentials file directory
	credentialsFileDirMode os.FileMode = 0700

	// Permissions for the credentials file
	credentialsFileMode os.FileMode = 0600

	// ExpirationKeyName is the key in the credentials file indicating when the profile will expire
	ExpirationKeyName = "expires"

	// CagoManagedKeyName it the key in the credentials file indicating the profile is managed by Cago
	CagoManagedKeyName = "cago_managed"
)

var (
	// CredentialsFilePath is the path to the AWS credentials file; Defaults to ~/.aws/credentials
	CredentialsFilePath = home.Dir() + string(os.PathSeparator) + ".aws" + string(os.PathSeparator) + "credentials"
)

// SetExpiration sets the expiration time for the profile
func SetExpiration(profileName string, expiration time.Time) error {
	// Grab the credentials file
	credentialsFile, getCredentialsFileError := getCredentialsFile()
	if getCredentialsFileError != nil {
		return errors.WrapPrefix(getCredentialsFileError, fmt.Sprintf("Unable to set expiration for profile: %s", profileName), 0)
	}

	// Grab the section
	profileSection, getSectionError := credentialsFile.GetSection(profileName)
	if getSectionError != nil {
		return errors.WrapPrefix(getSectionError, fmt.Sprintf("Cannot set expiration, profile does not exist: %s", profileName), 0)
	}

	if !profileSection.HasKey(CagoManagedKeyName) {
		return errors.Errorf("Profile is not being managed by Cago: %s", profileName)
	}

	_, newKeyError := profileSection.NewKey(ExpirationKeyName, expiration.Format(time.RFC3339))
	if newKeyError != nil {
		return errors.WrapPrefix(newKeyError, fmt.Sprintf("Unable to set expiration in credentials file: %s", profileName), 0)
	}

	saveError := credentialsFile.SaveTo(CredentialsFilePath)
	if saveError != nil {
		return errors.WrapPrefix(saveError, fmt.Sprintf("Unable to save credentials file changes to profile: %s", profileName), 0)
	}

	return nil
}

// DoesProfileExist returns true if the profile exists; false if not; error if there was a problem accessing the credentials file
func DoesProfileExist(profileName string) (bool, error) {
	// Grab the credentials file
	credentialsFile, getCredentialsFileError := getCredentialsFile()
	if getCredentialsFileError != nil {
		return false, errors.WrapPrefix(getCredentialsFileError, fmt.Sprintf("Unable to get expiration for profile: %s", profileName), 0)
	}

	// Grab the section
	_, getSectionError := credentialsFile.GetSection(profileName)
	if getSectionError != nil {
		return false, nil
	}

	return true, nil
}

// IsExpired returns true if the profile has expired; false if not; an error if the expiration is not set
func IsExpired(profileName string) (bool, error) {
	// Grab the credentials file
	credentialsFile, getCredentialsFileError := getCredentialsFile()
	if getCredentialsFileError != nil {
		return true, errors.WrapPrefix(getCredentialsFileError, fmt.Sprintf("Unable to open credentials file"), 0)
	}

	// Grab the section
	profileSection, getSectionError := credentialsFile.GetSection(profileName)
	if getSectionError != nil {
		return true, errors.WrapPrefix(getSectionError, fmt.Sprintf("Unable to get section: %s", profileName), 0)
	}

	expirationKey, getKeyError := profileSection.GetKey(ExpirationKeyName)
	if getKeyError != nil {
		return true, errors.WrapPrefix(getKeyError, fmt.Sprintf("Unable to get expiration key for profile: %s", profileName), 0)
	}

	expirationTime, timeError := expirationKey.Time()
	if timeError != nil {
		return true, errors.WrapPrefix(timeError, fmt.Sprintf("Unable to parse expiration for profile: %s", profileName), 0)
	}

	if time.Now().After(expirationTime) {
		// The time right now is after the expiration time
		return true, nil
	}

	return false, nil
}

// AddProfile creates a new profile; returns an error if the profile couldn't be created
func AddProfile(profileName string) error {
	// Grab the credentials file
	credentialsFile, getCredentialsFileError := getCredentialsFile()
	if getCredentialsFileError != nil {
		return errors.WrapPrefix(getCredentialsFileError, fmt.Sprintf("Unable to add profile: %s", profileName), 0)
	}

	// Make sure the section does not already exist
	_, getSectionError := credentialsFile.GetSection(profileName)
	if getSectionError == nil {
		return errors.Errorf("Profile %s already exists", profileName)
	}

	// Create the new section to store the profile
	newSection, newSectionError := credentialsFile.NewSection(profileName)
	if newSectionError != nil {
		return errors.WrapPrefix(newSectionError, fmt.Sprintf("Unable to add profile: %s", profileName), 0)
	}

	// Mark this new section as being managed by Cago
	_, newKeyError := newSection.NewKey(CagoManagedKeyName, "true")
	if newKeyError != nil {
		return errors.WrapPrefix(newKeyError, fmt.Sprintf("Unable to create new key for profile: %s", profileName), 0)
	}

	log.Debugf("Saving credentials file to: %s", CredentialsFilePath)

	saveError := credentialsFile.SaveTo(CredentialsFilePath)
	if saveError != nil {
		return errors.WrapPrefix(saveError, fmt.Sprintf("Unable to save credentials file changes to profile: %s", profileName), 0)
	}

	return nil
}

// DeleteProfile deletes a profile; returns an error if the profile couldn't be deleted
func DeleteProfile(profileName string) error {
	// Grab the credentials file
	credentialsFile, getCredentialsFileError := getCredentialsFile()
	if getCredentialsFileError != nil {
		return errors.WrapPrefix(getCredentialsFileError, fmt.Sprintf("Unable to delete profile: %s", profileName), 0)
	}

	credentialsFile.DeleteSection(profileName)

	saveError := credentialsFile.SaveTo(CredentialsFilePath)
	if saveError != nil {
		return errors.WrapPrefix(saveError, fmt.Sprintf("Unable to save credentials file changes to profile: %s", profileName), 0)
	}

	return nil
}

// AddKeyValue adds a key value pair to the profile
func AddKeyValue(profileName string, keyName string, keyValue string) error {
	credentialsFile, getCredentialsFileError := getCredentialsFile()
	if getCredentialsFileError != nil {
		return errors.WrapPrefix(getCredentialsFileError, "Unable to retrieve credentials file", 0)
	}

	profileSection, getSectionError := credentialsFile.GetSection(profileName)
	if getSectionError != nil {
		return errors.WrapPrefix(getSectionError, fmt.Sprintf("Unable to retrieve section from credentials file: %s", profileName), 0)
	}

	_, newKeyError := profileSection.NewKey(keyName, keyValue)
	if newKeyError != nil {
		return errors.WrapPrefix(newKeyError, fmt.Sprintf("Unable to create key in section: %s", profileName), 0)
	}

	saveError := credentialsFile.SaveTo(CredentialsFilePath)
	if saveError != nil {
		return errors.WrapPrefix(saveError, fmt.Sprintf("Unable to save credentials file changes to profile: %s", profileName), 0)
	}

	return nil
}

// GetKeyValue returns the value associated with a key for the profile; returns empty string if value does not exist
func GetKeyValue(profileName string, key string) (string, error) {
	credentialsFile, getCredentialsFileError := getCredentialsFile()
	if getCredentialsFileError != nil {
		return "", errors.WrapPrefix(getCredentialsFileError, "Unable to retrieve credentials file", 0)
	}

	profileSection, getSectionError := credentialsFile.GetSection(profileName)
	if getSectionError != nil {
		return "", errors.WrapPrefix(getSectionError, fmt.Sprintf("Unable to retrieve section from credentials file: %s", profileName), 0)
	}

	sectionKey, getKeyError := profileSection.GetKey(key)
	if getKeyError != nil {
		return "", errors.WrapPrefix(getSectionError, fmt.Sprintf("Unable to retrieve key from section: %s", profileName), 0)
	}

	return sectionKey.String(), nil
}

// GetAllManagedProfileNames returns a list of the names of all managed profiles
func GetAllManagedProfileNames() ([]string, error) {
	credentialsFile, getCredentialsFileError := getCredentialsFile()
	if getCredentialsFileError != nil {
		return nil, errors.WrapPrefix(getCredentialsFileError, "Unable to retrieve credentials file", 0)
	}

	log.Debug("Reading existing profiles from credentials file")

	// Grab a list of all the sections in the credentials file
	allProfiles := credentialsFile.Sections()
	var profileNames []string
	for _, profile := range allProfiles {
		// Check to see if this is a profile that we're managing
		if profile.HasKey(CagoManagedKeyName) {
			log.Debugf("Profile %s is managed", profile.Name())

			profileNames = append(profileNames, profile.Name())
		} else {
			log.Debugf("Profile %s is not managed, skipping", profile.Name())
		}
	}

	sort.Strings(profileNames)

	return profileNames, nil
}

// GetCredentialsFile Returns the credentials file, creates a new empty file if it does not already exist
func getCredentialsFile() (credentialsFile *ini.File, err error) {
	// Check to see if a credential file already exists
	if _, err := os.Stat(CredentialsFilePath); err == nil {
		// If so, load it
		log.Debugf("Loading credentials file: %s", CredentialsFilePath)
		credentialsFile, err = ini.Load(CredentialsFilePath)
		if err != nil {
			return nil, errors.WrapPrefix(err, fmt.Sprintf("Unable to load credentials file: %s", CredentialsFilePath), 0)
		}
	} else {
		// If not, create it
		log.Debugf("Credentials file not found, creating empty file: %s", CredentialsFilePath)
		mkdirError := os.MkdirAll(filepath.Dir(CredentialsFilePath), credentialsFileDirMode)
		if mkdirError != nil {
			return nil, errors.WrapPrefix(mkdirError, fmt.Sprintf("Unable to create directory: %s", CredentialsFilePath), 0)
		}

		log.Debugf("Creating new credentials file: %s", CredentialsFilePath)
		rawCredentialsFile, createError := os.Create(CredentialsFilePath)
		if createError != nil {
			return nil, errors.WrapPrefix(createError, fmt.Sprintf("Unable to create empty credentials file: %s", CredentialsFilePath), 0)
		}

		log.Debugf("Updating credentials file mode")
		chmodError := rawCredentialsFile.Chmod(credentialsFileMode)
		if chmodError != nil {
			return nil, errors.WrapPrefix(chmodError, fmt.Sprintf("Unable to chmod credentials file: %s", CredentialsFilePath), 0)
		}

		log.Debugf("Closing new credentials file: %s", CredentialsFilePath)
		closeError := rawCredentialsFile.Close()
		if closeError != nil {
			return nil, errors.WrapPrefix(closeError, fmt.Sprintf("Unable to close credentials file: %s", CredentialsFilePath), 0)
		}

		log.Debugf("Saving empty credentials file: %s", CredentialsFilePath)
		credentialsFile = ini.Empty()
		saveError := credentialsFile.SaveTo(CredentialsFilePath)
		if saveError != nil {
			return nil, errors.WrapPrefix(saveError, fmt.Sprintf("Unable to save credentials file: %s", CredentialsFilePath), 0)
		}
	}

	return credentialsFile, nil
}
