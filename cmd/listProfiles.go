package cmd // import "electric-it.io/cago"

import (
	"fmt"
	"os"

	"github.com/apex/log"
	"github.com/spf13/cobra"

	"electric-it.io/cago/aws"
)

// listProfilesCmd represents the list-profiles command
var listProfilesCmd = &cobra.Command{
	Use:   "list-profiles",
	Short: "List the available profiles",
	Long:  ``,
	RunE: func(cmd *cobra.Command, args []string) error {
		profileNames := aws.GetAllManagedProfileNames()

		for _, profileName := range profileNames {
			// This must go to stdout
			fmt.Printf("%s\n", profileName)
		}

		return nil
	},
}

func init() {
	RootCmd.AddCommand(listProfilesCmd)
}
