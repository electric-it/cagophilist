package saml // import "electric-it.io/cago"

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"

	"github.com/AlecAivazis/survey"
	"github.com/PuerkitoBio/goquery"
	"github.com/apex/log"
	"github.com/beevik/etree"
	"github.com/spf13/viper"

	"electric-it.io/cago/aws"
	"electric-it.io/cago/credentials"
	"electric-it.io/cago/net"
)

// GetSAMLAssertionBase64 Asks the user for their credentials and then retrieves the SAML assertion from the IdP
func GetSAMLAssertionBase64() (string, error) {
	username := getUsername()
	password := getPassword()

	httpClient := net.GetHTTPClient()

	// Some fancy trickery to figure out if authentication failed
	httpClient.CheckRedirect = checkRedirect

	form := url.Values{}
	form.Add("username", username)
	form.Add("password", password)
	form.Add("TARGET", viper.GetString("TargetUrl"))

	authenticationURL := viper.GetString("AuthenticationUrl")

	req, err := http.NewRequest("POST", authenticationURL, strings.NewReader(form.Encode()))
	if err != nil {
		log.Fatalf("Error creating new request: %s", err)
		os.Exit(1)
	}

	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")

	log.Debugf("Posting credentials to the IdP: %s", authenticationURL)

	res, err := httpClient.Do(req)
	if err != nil {
		log.Fatalf("Error posting to IdP: %s", err)
		os.Exit(1)
	}

	log.Debug("Response from the IdP:")

	dump, dumpResponseError := httputil.DumpResponse(res, true)
	if dumpResponseError != nil {
		log.Fatalf("Error dumping response from IdP: %s", dumpResponseError)
		os.Exit(1)
	}

	log.Debugf("%q", dump)

	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		log.Fatalf("Error creating new document from response: %s", err)
		os.Exit(1)
	}

	samlAssertionBase64, exists := doc.Find("input[name='SAMLResponse']").Attr("value")
	if !exists {
		log.Fatalf("Unable to locate SAMLResponse!")
		os.Exit(1)
	}

	return samlAssertionBase64, nil
}

// GetAuthorizedRoles Returns a list of all roles the uers is authorized to assume
func GetAuthorizedRoles(samlAssertionBase64 string) ([]*aws.Role, error) {
	samlAssertion, err := base64.StdEncoding.DecodeString(samlAssertionBase64)
	if err != nil {
		log.Errorf("Error decoding SAML assertion: %s", err)
		return nil, err
	}

	extractedRoles, err := ExtractAwsRoles(samlAssertion)
	if err != nil {
		log.Errorf("Error extracting AWS roles: %s", err)
		return nil, err
	}

	authorizedRoles, err := aws.ParseAWSRoles(extractedRoles)
	if err != nil {
		log.Errorf("Error parsing AWS roles: %s", err)
		return nil, err
	}

	return authorizedRoles, nil
}

// This method will get called during a redirect, tries to guess when authentication fails
func checkRedirect(req *http.Request, via []*http.Request) error {
	hostname := req.URL.Hostname()
	log.Debugf("Redrecting to %s", hostname)

	return nil
}

func getUsername() string {
	// Check to see if user wants us to prompt for credentials
	var username string
	if !viper.GetBool("prompt-for-credentials") {
		username = credentials.GetUsername()
		if username != "" {
			log.Info("Using cached username")
			return username
		}
	}

	usernamePrompt := &survey.Input{
		Message: "Your SSO",
	}
	err := survey.AskOne(usernamePrompt, &username, nil)
	if err != nil {
		log.Fatalf("Error in prompt: %s", err)
	}

	if strings.TrimSpace(username) == "" {
		log.Fatal("Cago requires a username to proceed")
		os.Exit(1)
	}

	// Put the last entry into the cache
	credentials.SetUsername(username)

	return username
}

func getPassword() string {
	// Check to see if user wants us to prompt for credentials
	var password string
	if !viper.GetBool("prompt-for-credentials") {
		password = credentials.GetPassword()
		if password != "" {
			log.Info("Using cached password")
			return password
		}
	}

	passwordPrompt := &survey.Password{
		Message: "Password",
	}
	err := survey.AskOne(passwordPrompt, &password, nil)
	if err != nil {
		log.Fatalf("Error in prompt: %s", err)
	}

	if strings.TrimSpace(password) == "" {
		log.Fatal("Cago requires a password to proceed")
		os.Exit(1)
	}

	credentials.SetPassword(password)

	return password
}

// Original Source: https://github.com/Versent/saml2aws
// Original License:
//   This code is Copyright (c) 2015 Versent and released under the MIT license.
//   All rights not explicitly granted in the MIT license are reserved.
//
const (
	assertionTag          = "Assertion"
	attributeStatementTag = "AttributeStatement"
	attributeTag          = "Attribute"
	attributeValueTag     = "AttributeValue"
)

//ErrMissingElement is the error type that indicates an element and/or attribute is
//missing. It provides a structured error that can be more appropriately acted
//upon.
type ErrMissingElement struct {
	Tag, Attribute string
}

//ErrMissingAssertion indicates that an appropriate assertion element could not
//be found in the SAML Response
var (
	ErrMissingAssertion = ErrMissingElement{Tag: assertionTag}
)

func (e ErrMissingElement) Error() string {
	if e.Attribute != "" {
		return fmt.Sprintf("missing %s attribute on %s element", e.Attribute, e.Tag)
	}

	return fmt.Sprintf("missing %s element", e.Tag)
}

// ExtractAwsRoles given an assertion document extract the aws roles
func ExtractAwsRoles(data []byte) ([]string, error) {
	awsroles := []string{}

	doc := etree.NewDocument()
	if err := doc.ReadFromBytes(data); err != nil {
		return awsroles, err
	}

	assertionElement := doc.FindElement(".//Assertion")
	if assertionElement == nil {
		return nil, ErrMissingAssertion
	}

	//Get the actual assertion attributes
	attributeStatement := assertionElement.FindElement(childPath(assertionElement.Space, attributeStatementTag))
	if attributeStatement == nil {
		return nil, ErrMissingElement{Tag: attributeStatementTag}
	}

	attributes := attributeStatement.FindElements(childPath(assertionElement.Space, attributeTag))
	for _, attribute := range attributes {
		if attribute.SelectAttrValue("Name", "") != "https://aws.amazon.com/SAML/Attributes/Role" {
			continue
		}
		atributeValues := attribute.FindElements(childPath(assertionElement.Space, attributeValueTag))
		for _, attrValue := range atributeValues {
			awsroles = append(awsroles, attrValue.Text())
		}
	}

	return awsroles, nil
}

func childPath(space, tag string) string {
	if space == "" {
		return "./" + tag
	}

	return "./" + space + ":" + tag
}
