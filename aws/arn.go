// Copyright (c) 2015, Remind101, Inc.
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this
//    list of conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
// FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
// DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
// OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

// Source https://github.com/remind101/empire/blob/master/pkg/arn/arn.go

// Package aws is a Go package for parsing Amazon Resource Names.
package aws // import "electric-it.io/cago"

import (
	"errors"
	"strings"
)

var (
	// ErrInvalidARN may be returned when parsing a string that is not a valid ARN.
	ErrInvalidARN = errors.New("invalid ARN")

	// ErrInvalidResource may be returned when an ARN Resrouce is not valid.
	ErrInvalidResource = errors.New("invalid ARN resource")
)

const delimiter = ":"

// ARN represents a parsed Amazon Resource Name.
type ARN struct {
	ARN      string
	AWS      string
	Service  string
	Region   string
	Account  string
	Resource string
}

// ParseARN parses an Amazon Resource Name from a String into an ARN.
func ParseARN(arn string) (*ARN, error) {
	p := strings.SplitN(arn, delimiter, 6)

	// Ensure that we have all the components that make up an ARN.
	if len(p) < 6 {
		return nil, ErrInvalidARN
	}

	a := &ARN{
		ARN:      p[0],
		AWS:      p[1],
		Service:  p[2],
		Region:   p[3],
		Account:  p[4],
		Resource: p[5],
	}

	// ARN's always start with "arn:aws" (hopefully).
	if a.ARN != "arn" || (a.AWS != "aws" && a.AWS != "aws-us-gov") {
		return nil, ErrInvalidARN
	}

	return a, nil
}

// String returns the string representation of an Amazon Resource Name.
func (a *ARN) String() string {
	return strings.Join(
		[]string{a.ARN, a.AWS, a.Service, a.Region, a.Account, a.Resource},
		delimiter,
	)
}

// SplitResource splits the Resource section of an ARN into its type and id
// components.
func SplitResource(r string) (resource, id string, err error) {
	p := strings.Split(r, "/")

	if len(p) != 2 {
		err = ErrInvalidResource
		return
	}

	resource = p[0]
	id = p[1]

	return
}

// ResourceID takes an ARN string and returns the resource ID from it.
func ResourceID(arn string) (string, error) {
	a, err := ParseARN(arn)
	if err != nil {
		return "", err
	}

	_, id, err := SplitResource(a.Resource)
	return id, err
}
