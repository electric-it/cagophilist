package aws_test // import "electric-it.io/cago"

import (
	"os"
	"sort"
	"testing"
	"time"

	"github.com/apex/log"
	"github.com/go-errors/errors"
	"github.com/thoas/go-funk"

	"electric-it.io/cago/aws"
)

func TestDoesProfileExist(t *testing.T) {
	log.SetLevel(log.DebugLevel)

	aws.CredentialsFilePath = "testdata/good-credentials-file.ini"

	{
		profileExists, doesProfileExistError := aws.DoesProfileExist("NonExistentProfile")
		if doesProfileExistError != nil {
			t.Fatalf("Unable to check if profile exists\n%s", doesProfileExistError.(*errors.Error).ErrorStack())
		}

		if profileExists {
			t.Errorf("got %t; expected false", profileExists)
		}
	}

	{
		profileExists, doesProfileExistError := aws.DoesProfileExist("ProfileA")
		if doesProfileExistError != nil {
			t.Fatalf("Unable to check if profile exists\n%s", doesProfileExistError.(*errors.Error).ErrorStack())
		}

		if !profileExists {
			t.Errorf("got %t; expected true", profileExists)
		}
	}
}

func TestAddProfile(t *testing.T) {
	log.SetLevel(log.DebugLevel)

	aws.CredentialsFilePath = os.TempDir() + "cago-test." + funk.RandomString(16) + ".ini"
	t.Logf("Using temporary credentials file: %s", aws.CredentialsFilePath)

	defer os.Remove(aws.CredentialsFilePath)

	{
		addProfileError := aws.AddProfile("NewProfile")
		if addProfileError != nil {
			t.Fatalf("Unable to add profile\n%s", addProfileError.(*errors.Error).ErrorStack())
		}
	}

	{
		addProfileError := aws.AddProfile("NewProfile")
		if addProfileError == nil {
			t.Fatalf("Expected error when trying to add profile that already exists")
		}
	}
}

func TestDeleteProfile(t *testing.T) {
	log.SetLevel(log.DebugLevel)

	aws.CredentialsFilePath = os.TempDir() + "cago-test." + funk.RandomString(16) + ".ini"
	t.Logf("Using temporary credentials file: %s", aws.CredentialsFilePath)

	defer os.Remove(aws.CredentialsFilePath)

	{
		addProfileError := aws.AddProfile("NewProfile")
		if addProfileError != nil {
			t.Fatalf("Unable to add profile\n%s", addProfileError.(*errors.Error).ErrorStack())
		}
	}

	{
		deleteProfileError := aws.DeleteProfile("NewProfile")
		if deleteProfileError != nil {
			t.Fatalf("Unable to delete profile\n%s", deleteProfileError.(*errors.Error).ErrorStack())
		}
	}

	{
		deleteProfileError := aws.DeleteProfile("NewProfile")
		if deleteProfileError != nil {
			t.Fatalf("Unable to delete profile\n%s", deleteProfileError.(*errors.Error).ErrorStack())
		}
	}
}

func TestSetExpiration(t *testing.T) {
	log.SetLevel(log.DebugLevel)

	aws.CredentialsFilePath = "testdata/good-credentials-file.ini"

	{
		setExpirationError := aws.SetExpiration("NotCagoManaged", time.Now())
		if setExpirationError == nil {
			t.Fatalf("Expected an error when trying to set expiration on a non-Cago managed profile")
		}
	}

	aws.CredentialsFilePath = os.TempDir() + "cago-test." + funk.RandomString(16) + ".ini"
	t.Logf("Using temporary credentials file: %s", aws.CredentialsFilePath)

	defer os.Remove(aws.CredentialsFilePath)

	{
		setExpirationError := aws.SetExpiration("NonExistentProfile", time.Now())
		if setExpirationError == nil {
			t.Fatalf("Expected an error when trying to set expiration on a non-existent profile")
		}
	}

	// Create a profile in the temporary file to play with
	addProfileError := aws.AddProfile("ProfileA")
	if addProfileError != nil {
		t.Fatalf("Unable to add profile\n%s", addProfileError.(*errors.Error).ErrorStack())
	}

	expirationTime := time.Now()
	setExpirationError := aws.SetExpiration("ProfileA", expirationTime)
	if setExpirationError != nil {
		t.Fatalf("Unable to check expiration\n%s", setExpirationError.(*errors.Error).ErrorStack())
	}
}

func TestIsExpired(t *testing.T) {
	log.SetLevel(log.DebugLevel)

	aws.CredentialsFilePath = "testdata/IsExpired-credentials-file.ini"

	{
		isExpired, isExpiredError := aws.IsExpired("ExpiredProfile")
		if isExpiredError != nil {
			t.Fatalf("Unable to check expiration: %s\n%s", isExpiredError, isExpiredError.(*errors.Error).ErrorStack())
		}

		if !isExpired {
			t.Errorf("got %t; expected true", isExpired)
		}
	}

	{
		isExpired, isExpiredError := aws.IsExpired("NotExpiredProfile")
		if isExpiredError != nil {
			t.Fatalf("Unable to check expiration: %s\n%v", isExpiredError, isExpiredError.(*errors.Error).ErrorStack())
		}

		if isExpired {
			t.Errorf("got %t; expected false", isExpired)
		}
	}

	{
		_, isExpiredError := aws.IsExpired("NotAProfile")
		if isExpiredError == nil {
			t.Fatalf("Expected an error when trying to check a non-existent profile")
		}
	}

	{
		_, isExpiredError := aws.IsExpired("ProfileA")
		if isExpiredError == nil {
			t.Fatalf("Expected an error when trying to check a profile with no expiration set")
		}
	}

	{
		_, isExpiredError := aws.IsExpired("UnparsableExpirationProfile")
		if isExpiredError == nil {
			t.Fatalf("Expected an error when trying to check a profile with a non-parsable time")
		}
	}
}

func TestGetAllManagedProfileNames_BadCredentialsFile(t *testing.T) {
	log.SetLevel(log.DebugLevel)

	aws.CredentialsFilePath = "testdata/bad-credentials-file.ini"

	{
		_, getAllManagedProfileNamesError := aws.GetAllManagedProfileNames()
		if getAllManagedProfileNamesError == nil {
			t.Fatalf("Expected error for GetAllManagedProfileNames() using bad credentials file\n%s", getAllManagedProfileNamesError.(*errors.Error).ErrorStack())
		}
	}

	{
		addProfileError := aws.AddProfile("ProfileName")
		if addProfileError == nil {
			t.Fatalf("Expected error for AddProfile() using bad credentials file\n%s", addProfileError.(*errors.Error).ErrorStack())
		}
	}

	{
		_, isExpiredError := aws.IsExpired("ProfileName")
		if isExpiredError == nil {
			t.Fatalf("Expected error for IsExpired() using bad credentials file\n%s", isExpiredError.(*errors.Error).ErrorStack())
		}
	}

	{
		setExpirationError := aws.SetExpiration("ProfileName", time.Now())
		if setExpirationError == nil {
			t.Fatalf("Expected error for IsExpired() using bad credentials file\n%s", setExpirationError.(*errors.Error).ErrorStack())
		}
	}
}

func TestGetAllManagedProfileNames(t *testing.T) {
	log.SetLevel(log.DebugLevel)

	testCases := []struct {
		credentialsFile string
		profileNames    []string
	}{
		{"testdata/good-credentials-file.ini", []string{"ProfileA", "ProfileB", "ExpiredProfile", "NotExpiredProfile"}},
	}

	for _, testCase := range testCases {
		aws.CredentialsFilePath = testCase.credentialsFile

		managedProfileNames, getAllManagedProfileNamesError := aws.GetAllManagedProfileNames()
		if getAllManagedProfileNamesError != nil {
			t.Fatalf("Unable to get managed profile names\n%s", getAllManagedProfileNamesError.(*errors.Error).ErrorStack())
		}

		t.Logf("Managed profile names: %v", managedProfileNames)
		if len(managedProfileNames) != len(testCase.profileNames) {
			t.Errorf("got %d names; expected %d names", managedProfileNames, len(testCase.profileNames))
		}

		sort.Strings(testCase.profileNames)
		for _, name := range managedProfileNames {
			t.Logf("Checking for: %s", name)
			if sort.SearchStrings(testCase.profileNames, name) >= len(testCase.profileNames) {
				t.Fatalf("missing profile: %s", name)
			}
		}
	}
}

func TestGetKeyValue(t *testing.T) {
	log.SetLevel(log.DebugLevel)

	aws.CredentialsFilePath = "testdata/good-credentials-file.ini"

	{
		_, getKeyValueError := aws.GetKeyValue("NonExistentProfile", "test-key")
		if getKeyValueError == nil {
			t.Fatalf("Expected error trying to get key value to a non-existent profile")
		}
	}

	{
		_, getKeyValueError := aws.GetKeyValue("ProfileA", "test-key")
		if getKeyValueError == nil {
			t.Fatalf("Expected error trying to get non-existent key value")
		}
	}

	{
		keyValue, getKeyValueError := aws.GetKeyValue("ProfileA", "cago_managed")
		if getKeyValueError != nil {
			t.Fatalf("Unable to get key value")
		}

		if keyValue != "true" {
			t.Errorf("got %s names; expected %s names", keyValue, "true")
		}
	}
}

func TestAddKeyValue(t *testing.T) {
	log.SetLevel(log.DebugLevel)

	aws.CredentialsFilePath = os.TempDir() + "cago-test." + funk.RandomString(16) + ".ini"
	t.Logf("Using temporary credentials file: %s", aws.CredentialsFilePath)

	defer os.Remove(aws.CredentialsFilePath)

	{
		addKeyValueError := aws.AddKeyValue("TestProfile", "test-key", "test-value")
		if addKeyValueError == nil {
			t.Fatalf("Expected error trying to add a key value to a non-existent profile")
		}
	}

	{
		addProfileError := aws.AddProfile("TestProfile")
		if addProfileError != nil {
			t.Fatalf("Unable to add test profile\n%s", addProfileError.(*errors.Error).ErrorStack())
		}

		addKeyValueError := aws.AddKeyValue("TestProfile", "test-key", "test-value")
		if addKeyValueError != nil {
			t.Fatalf("Unable to add key value\n%s", addKeyValueError.(*errors.Error).ErrorStack())
		}
	}

	{
		addKeyValueError := aws.AddKeyValue("TestProfile", "", "test-value")
		if addKeyValueError == nil {
			t.Fatalf("Expected error trying to add a key with no name")
		}
	}
}
