package credentials

import (
	"github.com/zalando/go-keyring"

	"github.com/apex/log"
)

// SetPassword stores the password in the OS credential store
func SetPassword(password string) {
	setError := keyring.Set("cagophilist", "password", password)
	if setError != nil {
		log.Errorf("Unable to store password in cache: %s", setError)
	}

	log.Debug("Password stored in cache")
}

// GetPassword retrieves the password in the OS credential store
func GetPassword() string {
	secret, getError := keyring.Get("cagophilist", "password")
	if getError != nil {
		log.Errorf("Unable to retrieve password from cache: %s", getError)
		return ""
	}

	log.Debug("Password retrieved from cache")

	return secret
}

// SetUsername stores the username in the OS credential store
func SetUsername(username string) {
	setError := keyring.Set("cagophilist", "username", username)
	if setError != nil {
		log.Errorf("Unable to store username in cache: %s", setError)
	}

	log.Debug("Username stored in cache")
}

// GetUsername retrieves the username in the OS credential store
func GetUsername() string {
	secret, getError := keyring.Get("cagophilist", "username")
	if getError != nil {
		log.Errorf("Unable to retrieve username from cache: %s", getError)
		return ""
	}

	log.Debug("Username retrieved from cache")

	return secret
}
