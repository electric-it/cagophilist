package cmd // import "electric-it.io/cago"

import (
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"

	"github.com/AlecAivazis/survey"
	"github.com/apex/log"
	"github.com/spf13/cobra"

	homedir "github.com/mitchellh/go-homedir"

	"electric-it.io/cago/aws"
)

const (
	// The selected file will be written to this file for use by wrapper scripts
	profileOutputFileName = ".cago/cago.profile.txt"
)

// chooseProfileCmd represents the chooseProfile command
var chooseProfileCmd = &cobra.Command{
	Use:   "choose-profile",
	Short: "Choose from a list of Cago managed profiles and return the chosen profile to stdout",
	Long:  ``,
	Run: func(cmd *cobra.Command, args []string) {
		profileNames := aws.GetAllManagedProfileNames()

		if len(profileNames) == 0 {
			log.Fatalf("No managed profiles found! You probably should do a refresh.")
			os.Exit(1)
		}

		profile := ""
		prompt := &survey.Select{
			Message: "Choose a profile:",
			Options: profileNames,
		}
		err := survey.AskOne(prompt, &profile, nil)
		if err != nil {
			log.Fatalf("Error in prompt: %s", err)
		}

		// Output the selected profile to a temporary file
		profileOutputFile := getProfileOutputFile()
		log.Debugf("Writing selected profile to: %s", profileOutputFile)
		writeError := ioutil.WriteFile(profileOutputFile, []byte(profile), 0644)
		if writeError != nil {
			log.Fatalf("Unable to write profile to (%s): %s", profileOutputFile, writeError)
			os.Exit(1)
		}

		// This must go to stdout
		fmt.Println(profile)
	},
}

func init() {
	RootCmd.AddCommand(chooseProfileCmd)
}

func getProfileOutputFile() string {
	homedirpath, homedirError := homedir.Dir()
	if homedirError != nil {
		log.Fatalf("Unable to get user's home directory, bailing out: %s", homedirError)
		os.Exit(1)
	}

	// Calculate the location of the file to write the selected profile to
	return filepath.Join(homedirpath, profileOutputFileName)
}
