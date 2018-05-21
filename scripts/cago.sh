#!/bin/sh
# Note: The shebang is not required, as this script is intended to be sourced, but it is used by Shellcheck
# Also note... trying to stay POSIX compliant

# Since this is sourced, we need to be sure to setup our variables
unset FLAGS NEW_PROFILE
SET_AWS_PROFILE_ONLY=0
DEBUG=0

usage()
{
    echo "Cago wrapper script to manage AWS environment variables:"
    echo "  AWS_PROFILE, AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN"
    echo
    echo "Usage: source /path/to/script/cago.sh <command> [arguments]"
    echo "Commands:"
    echo "  list       - List all existing profiles"
    echo "  refresh    - Refresh all existing profiles"
    echo "  switch     - Switch to a different profile"
    echo "  unset      - Clear all managed environment variables"
    echo "  version    - Output the version of Cago in use"
    echo "  init       - Sets some useful aliases"
    echo
    echo "Flags:"
    echo "  --set-aws-profile-only   - Only set the AWS_PROFILE variables, unset others. Works with refresh and switch"
    echo "  --prompt-for-credentials - Force Cago to prompt for credentials"
    echo "  --ignore-proxy-config    - Ignore the proxy servers listed in the configuration file"
    echo "  --debug                  - Go verbose"
    echo
}


# Asks the user to choose a new profile and updates managed environment variables
switchProfile() {
  cago choose-profile $FLAGS

  # If a profile was chosen, it will be written to a file
  if [ ! -f "$HOME/.cago/cago.profile.txt" ]; then
    if [ $DEBUG -eq 1 ]; then
      echo "   • Profile file not found"
    fi

    return 1
  fi

  # Read the selected profile in from the file
  NEW_PROFILE="$(cat $HOME/.cago/cago.profile.txt)"
  if [ $DEBUG -eq 1 ]; then
    echo "   • User chose the profile: $NEW_PROFILE"
  fi

  # The file could be empty!
  if [ -z $NEW_PROFILE ]; then
    if [ $DEBUG -eq 1 ]; then
      echo "   • Profile file was empty"
    fi

    return 1
  fi

  # Update the managed environment variables
  updateManagedEnvironmentVariables "$NEW_PROFILE"
  if [ $? -ne 0 ]; then
    echo "   • Cago failed...unable to update environment"

    return 1
  fi
}

# Updates managed environment variables: AWS_PROFILE, AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
updateManagedEnvironmentVariables() {
  # Set the AWS_PROFILE
  export AWS_PROFILE=$1

  # Note: https://stackoverflow.com/questions/3601515/how-to-check-if-a-variable-is-set-in-bash
  if [ -z ${AWS_PROFILE+x} ]; then
    echo "   • The updateManagedEnvironmentVariables function was not passed a profile!"

    return 1
  fi

  # First, clear out any existing environment variable
  unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN

  # Check to see if the user wants to update AWS_PROFILE only
  if [ "$SET_AWS_PROFILE_ONLY" -eq 1 ]; then
    echo "   • Cago set only AWS_PROFILE...Cago unset AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_SESSION_TOKEN"
  else
    export AWS_ACCESS_KEY_ID
    AWS_ACCESS_KEY_ID=$(cago get-profile-key $AWS_PROFILE aws_access_key_id)
    if [ $? -ne 0 ]; then
      echo "   • Cago failed...unable to get access key id for $AWS_PROFILE"

      return 1
    fi

    export AWS_SECRET_ACCESS_KEY
    AWS_SECRET_ACCESS_KEY=$(cago get-profile-key $AWS_PROFILE aws_secret_access_key)
    if [ $? -ne 0 ]; then
      echo "   • Cago failed...unable to get secret access key for $AWS_PROFILE"

      return 1
    fi

    export AWS_SESSION_TOKEN
    AWS_SESSION_TOKEN=$(cago get-profile-key $AWS_PROFILE aws_session_token)
    if [ $? -ne 0 ]; then
      echo "   • Cago failed...unable to get session token for $AWS_PROFILE"

      return 1
    fi

    echo "   • Cago set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_SESSION_TOKEN for profile: ${AWS_PROFILE}"
  fi
}

# Iterate through the arguments to process flags
for argument in "$@"
do
  case $argument in
    # This is a special flag for the wrapper script only
    "-d"*)
      DEBUG=1
      FLAGS="$FLAGS $argument"
      ;;

    # This is a special flag for the wrapper script only
    "--set-aws-profile-only")
      SET_AWS_PROFILE_ONLY=1
      ;;

    # The rest of the flags need to be sent on to the cago command
    "-"*)
      FLAGS="$FLAGS $argument"
      ;;
  esac
done

# The command for cago is always the first argument
COMMAND=$1

if [ $DEBUG -eq 1 ]; then
  echo "   • Command: $COMMAND"
  echo "   • Flags: $FLAGS"
fi

case $COMMAND in
        list)
                # List all the profiles
                cago list-profiles $FLAGS
                if [ $? -ne 0 ]; then
                  echo
                  echo "   • Cago failed...unable to list profiles"

                  return 1
                fi
                ;;
        refresh)
                # Refresh all the certificates
                cago refresh-profiles $FLAGS
                if [ $? -ne 0 ]; then
                  echo
                  echo "   • Cago failed...unable to sync and refresh profiles"

                  return 1
                fi

                # Check to see if the user has selected a profile
                # Note: https://stackoverflow.com/questions/3601515/how-to-check-if-a-variable-is-set-in-bash
                if [ -n "${AWS_PROFILE}" ]; then
                  if [ $DEBUG -eq 1 ]; then
                    echo "   • Updating environment variables for profile: ${AWS_PROFILE}"
                  fi

                  # If so, update the variables based on the current profile
                  updateManagedEnvironmentVariables "$AWS_PROFILE"
                fi
                ;;
        switch)
                switchProfile
                if [ $? -ne 0 ]; then
                  if [ $DEBUG -eq 1 ]; then
                    echo "   • Unable to switch profile"
                  fi

                  return 1
                fi

                # TODO: Check to see if the profile is expired, if so, refresh it
                ;;
        unset)
                unset AWS_PROFILE AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN

                echo "   • Cago unset AWS_PROFILE, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_SESSION_TOKEN"
                ;;
        init)
                # Create aliases for Cago
                alias cagol='source /usr/local/bin/cago.sh list'
                alias cagor='source /usr/local/bin/cago.sh refresh'
                alias cagos='source /usr/local/bin/cago.sh switch'
                alias cagou='source /usr/local/bin/cago.sh unset'
                ;;
        version)
                cago version $FLAGS
                ;;
        *)
                # Show the usage information
                usage
                ;;
esac
