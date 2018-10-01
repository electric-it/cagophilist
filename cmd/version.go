package cmd // import "electric-it.io/cago"

import (
	"fmt"

	"github.com/spf13/cobra"
)

// Version of the application, set at build time
var (
	Version = "Not versioned"
)

// versionCmd represents the version command
var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print the version number of Cago",
	Long:  `This is my version. There are many like it, but this one is mine.`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println(Version)
	},
}

func init() {
	RootCmd.AddCommand(versionCmd)
}
