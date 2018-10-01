package cmd // import "electric-it.io/cago"

import (
	"fmt"
	"os"

	"github.com/apex/log"
	"github.com/spf13/cobra"

	"electric-it.io/cago/aws"
)

// getAccessKeyIdCmd represents the getAccessKeyId command
var getProfileKeyCmd = &cobra.Command{
	Use:   "get-profile-key",
	Short: "Returns the value of the specified key from the specified profile",
	Long:  ``,
	Run: func(cmd *cobra.Command, args []string) {
		if len(args) != 2 {
			log.Fatalf("You must provide a profile and a key!")
			os.Exit(1)
		}
		profileName := args[0]
		keyName := args[1]

		log.Debugf("Getting key (%s) from profile (%s)", keyName, profileName)

		keyValue, err := aws.GetKeyValue(profileName, keyName)
		if err != nil {
			log.Errorf("Unable to find key (%s) in profile (%s): %s", keyName, profileName, err)
			os.Exit(1)
		}

		// This must be output to stdout
		fmt.Println(keyValue)
	},
}

func init() {
	RootCmd.AddCommand(getProfileKeyCmd)
}
