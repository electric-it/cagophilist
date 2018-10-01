package aws // import "electric-it.io/cago"

// Original Source: https://github.com/Versent/saml2aws
// Original License:
//   This code is Copyright (c) 2015 Versent and released under the MIT license.
//   All rights not explicitly granted in the MIT license are reserved.
//

import (
	"fmt"
	"strings"
)

// Role aws role attributes
type Role struct {
	RoleARN      string
	PrincipalARN string
	Name         string
}

// ParseAWSRoles parses and splits the roles while also validating the contents
func ParseAWSRoles(roles []string) ([]*Role, error) {
	awsRoles := make([]*Role, len(roles))

	for i, role := range roles {
		awsRole, err := parseRole(role)
		if err != nil {
			return nil, err
		}

		awsRoles[i] = awsRole
	}

	return awsRoles, nil
}

func parseRole(role string) (*Role, error) {
	tokens := strings.Split(role, ",")

	if len(tokens) != 2 {
		return nil, fmt.Errorf("Invalid role string only %d tokens", len(tokens))
	}

	awsRole := &Role{}

	for _, token := range tokens {
		if strings.Contains(token, ":saml-provider") {
			awsRole.PrincipalARN = token
		}
		if strings.Contains(token, ":role") {
			awsRole.RoleARN = token
		}
	}

	if awsRole.PrincipalARN == "" {
		return nil, fmt.Errorf("Unable to locate PrincipalARN in: %s", role)
	}

	if awsRole.RoleARN == "" {
		return nil, fmt.Errorf("Unable to locate RoleARN in: %s", role)
	}

	return awsRole, nil
}
