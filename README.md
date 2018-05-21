# Cagophilist (aka Cago)
Cago (_pronounced kay-go_) is a very simple tool for managing role-based access to AWS on the command line.

# About AWS Profiles
An AWS profile is simply a named set of credentials for accessing the AWS API. By default, AWS profiles are stored in an ini file: `~/.aws/credentials`. Each section in this ini file represent a different profile. Cago is used to manipulate these profiles and to copy values from profiles into environment variables.

Note: Cago adds a special key `cago_managed=true` to each key in your credentials file. This will allow you to maintain other profiles that Cago will not touch.

## Active Profile
At runtime, the AWS CLI and SDK read an environment variables named `AWS_PROFILE, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN` to determine the credentials to use when calling the AWS API.

# Mac and Linux Users
You need 3 things to get Cago running:
- Cago executables
  - Includes a binary and shell script
- Cago configuration file
  - Available remotely or you can provide locally
- Cago alias commands
  - Allow you to easily execute Cago as a sourced shell script

_Note: Be sure to run `cagor` once you get setup. This will sync your profiles to your authorized roles!_

## Mac Homebrew install
`brew install cago`

## Manual install
Download the latest release from GitHub and unzip the files to your path.

## Alias commands
The AWS CLI and SDK read credential information automatically from environment variables set in the user's current shell session.

On \*nix machines, shell environment variable can only be modified by running shell commands directly. As such, Cago provides a script, which can be sourced, to manipulate environment variables in the current shell. The 'cago.sh' script handles manipulating environment variables.

Again, this script must be sourced, so the command run in the current shell context. To make this easier, it's recommended that you can create aliases by adding the following to your login scripts (e.g. `~/.bashrc`):
```
alias cagol='source /usr/local/bin/cago.sh list'
alias cagor='source /usr/local/bin/cago.sh refresh'
alias cagos='source /usr/local/bin/cago.sh switch'
alias cagou='source /usr/local/bin/cago.sh unset'
```

_Note: You can now run `cago init` to set the above aliases for the current shell session_

# Windows Users

## Windows Install
Download the latest release for Windows from GitHub and unzip the files to a folder on your path.

You can run the init command `cago_win.bat init` to setup Cago with the configs below. There are various ways to run this script each time a `cmd` window is opened.

Keep going if you want to create the environment variables and aliases manually.

## Remote config file
Cago can pull a configuration file from a remote URL, so you can pickup changes from a common place. The config file will be cached on disk for when the remote URL is not accessible.
```
REM First set the environment variable that points to the remote config file
set CAGO_CONFIG_URL=TBD
setx CAGO_CONFIG_URL %CAGO_CONFIG_URL%
```

## Alias commands
On Windows, you can set a current environment variable from a command. You can use `doskey` to create aliases just like in \*nix:
```
REM The define the shortcuts to run Cago
doskey cagor=cago_win refresh-profiles
doskey cagol=cago_win list-profiles
doskey cagos=cago_win switch-profile
doskey cagou=cago_win unset
```

# Refresh Command (cagor)
This command works as follows:
1) Checks each Cago managed profile in your AWS credentials file, if none of them have expired, Cago exits. Note: You can override this behavior by adding the `--force-refresh` flag.
2) Cago asks for your credentials so that it can authenticate you and find out what roles you can use. Note: Cago will cache your credentials in your operating system secure store so you don't have to enter them again. Use the `prompt-for-credentials` flag to force Cago to ask for your credentials again.
3) Cago authenticates against the IdP and downloads a SAML assertion that lists all of the roles you can assume in AWS.
4) Cago creates or updates a profile in your AWS credentials file for each of those roles.
5) Cago cleans up your AWS credentials file by removing any Cago managed profiles that don't match a role in the SAML assertion.
6) Cago talks to the AWS token service to retrieve a fresh token for each profile in your AWS credentials file
7) As a convenience, if you have not yet selected a profile to use, Cago will ask you to choose one. See `cagos` for details.

_Note: Be sure to run `cagor` once you get setup. This will sync your profiles to your authorized roles!_

# Switch Command (cagos)
This command allows the user to switch to using a different profile. It allows the user to select a role and then updates the appropriate environment variables used by the CLI and SDK.

The flag `--set-aws-profile-only` will tell Cago to only set the  AWS_PROFILE environment variables. Cago will unset AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_SESSION_TOKEN. (Note: Currently not implemented for Windows)

# List Command (cagol)
This command will list all the profiles in the credentials file that Cago is managing.

# Unset Command (cagou)
Unsets all of the Cago managed AWS environment variables.

# Proxy Magic
We all love having to use proxy servers to reach the internet... right?! To try to make life a bit simpler, Cago tries to do some magic when proxies are present.

Here are the steps Cago takes to try to make your proxy-bound life easier...
1. If the `HTTP_PROXY` or `http_proxy` environment variables are set, you probably know what you're doing, Cago will use that value.
2. If the `--ignore-proxy-config` flag is set, you are telling Cago to not bother with any proxy configurations in the _configuration file_. Note, this flag is useless if any of the above environment variables are set.
3. Here be the magic! Cago will now go through each of the proxies in the HTTPProxies section of the configuration file. If Cago finds a working proxy, it'll use it! What a smarty! If none of them work, Cago will not use a proxy.

Hopefully this helps?

# Configuration File
Cago needs to read in a YAML file containing configuration information in order to run properly.

In order of highest precedence, Cago will read configuration information from:
1) Local file specified by `config-file` argument
    - If you pass the name of a config file using the `-c` or `--config-file` argument, Cago will use that
2) Remote URL
    - If you do _not_ pass the `-c` argument, but you _do_ set the `CAGO_CONFIG_URL` environment variable , Cago will download the configuration file from this HTTP or HTTPS URL
    - If successfully downloaded, the file will be saved to `.cago/cached.cago.yaml`
3) Locally cache remote file
    - If the `CAGO_CONFIG_URL` environment variable _is_ set, but Cago is unable to download the configuration file, it will use the previously cached configuration file from `.cago/cached.cago.yaml`
4) Local file in your home directory
    - If the `CAGO_CONFIG_URL` environment variable is _not_ set and the `-c` argument is _not_ passed, Cago will look for a file named `.cago/cago.yaml`

## Configuration File Format
```
# This is the default authentication URL for retrieving the SAML assertion
AuthenticationURL: <URL>

# This is the default target URLs for all accounts not listed in the AlternativeAuthenticationURLs section
TargetURL: <URL>

# List of all HTTP proxies to try to use, in order they'll be tried
# The first proxy on the list will be used for HTTP connections, unless the '--ignore-proxy' flag is enabled
# Format is...
# HTTPProxies - List of all proxies
#   ProxyAlias1: - Human readable alias for the proxy
#     ProxyURL: <What you would normally use the HTTP_PROXY environment variable for>
#     NoProxy: <What you would normally use the NO_PROXY environment variable for>
HTTPProxies:
  GENetwork:
    ProxyURL: "http://proxy.mycompany.com:80"
    NoProxy:  "localhost,.mycompany.com"

# Account metadata that Cago will add to the AWS profile file when it runs
AccountProfiles:
  <Account #1>:
    alias: <This is a keyword for Cago as it'll use the alias when listing profiles>
    anything: <This is a random key value pair that will be added to the profile file>
  <Account #2>:
    alias: acct2
  <Account #3>:
    alias: org1east
```

### AuthenticationURL
This is the URL that your username/password will be posted.

### TargetURL
This is where Cago will retrieve the SAML assertion from.

### AccountAlias
Maps account numbers to human readable names.

### Overriding the configuration file
You can override any of these at runtime by specifying an environment variable like `CAGO_TARGETURL=https://my.other.target`. The variable must be uppercase and prefixed with CAGO_

# Cago binaries
The Cago binary cannot set environment variables directly, so a wrapper shell script and batch script are provided. These wrapper scripts call the Cago binaries and use the output to set environment variables.

# Changes from Cago 1
Besides a full rewrite in Go, a couple changes to Cago behavior have been implemented:
- Profile names are now auto-generated based on the account alias and role name. This means you don't have to worry about manually mapping roles to profiles. This also keeps profile names consistent between Cago users, which makes sharing scripts easier.
- For \*nix systems, there is a shell script that is used to execute the Cago binary. This allows Cago to easily modify the environment variables in the current shell.
