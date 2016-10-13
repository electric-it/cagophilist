#!/usr/bin/env bash

bldred='\033[31m'; # Red
bldmag='\033[35m'; # Magenta
bldblu='\033[34m'; # Blue
bldgrn='\033[32m'; # Green
txtrst='\033[0m';  # Text Reset
usage="\tUsage:$bldmag source \$(cagophilist env update) <AWS Profile Name>$txtrst\n";

if [ -n "$ZSH_VERSION" ]; then
  src=${(%):-%N};
elif [ -n "$BASH_VERSION" ]; then
  src=${BASH_SOURCE[0]};
else
  err='Error: This shell type is not yet supported!';
  echo -e "\n\t$bldred$err$txtrst\n";
  echo -e $usage;
  return;
fi

# Make sure this script is being sourced
if [[ -n "$ZSH_VERSION" && $ZSH_EVAL_CONTEXT != "toplevel:file" ]]; then
  err='Error: You must source this script!';
  echo -e "\n\t$bldred$err$txtrst\n";
  echo -e $usage;
  return;
elif [[ -n "$BASH_VERSION" && $src == $0 ]]; then
  err='Error: You must source this script!';
  echo -e "\n\t$bldred$err$txtrst\n";
  echo -e $usage;
  return;
fi

DIR="$( cd "$( dirname "$src" )" && pwd )";

ini_sections=(`node $DIR/get_ini_sections.js`)

# Usage statement if not enough arguments passed in
if [[ ! "$#" -eq "0" ]]; then
  profile_name=$1
  if [[ ! "${ini_sections[*]}" == *$profile_name* ]]
  then
    err="Error: profile $profile_name not found, run command with profile to select one from the list.";
    echo -e "\n\t$bldred$err$txtrst\n";
    echo -e $usage;
    return;
  fi
else
  PS3='Select an AWS profile to use: '
  select profile_name in "${ini_sections[@]}"
  do
    break;
  done
fi

profile_check=`node $DIR/get_ini_section_values.js $profile_name check`
if [[ "$profile_check" != "true" ]]; then
  err="Error: profile $profile_name not found in the aws credentials file.";
  echo -e "\n\t$bldred$err$txtrst\n";
  echo -e $usage;
  return;
else
  region=`node $DIR/get_ini_section_values.js $profile_name region`
  aws_access_key_id=`node $DIR/get_ini_section_values.js $profile_name aws_access_key_id`
  aws_secret_access_key=`node $DIR/get_ini_section_values.js $profile_name aws_secret_access_key`
  aws_session_token=`node $DIR/get_ini_section_values.js $profile_name aws_session_token`
fi

echo -e "\n$bldblu Setting the environment variables using: $bldmag$profile_name$txtrst $bldblu.. $txtrst"

# Unset these first so they don't interfere with the CLI calls below
# Different tools look for different environment variables - Hooray for standardization...
unset AWS_REGION
unset AWS_PROFILE
unset AWS_ACCESS_KEY
unset AWS_ACCESS_KEY_ID

unset AWS_SECRET_KEY
unset AWS_SECRET_ACCESS_KEY

unset AWS_TOKEN
unset AWS_SESSION_TOKEN
unset AWS_SECURITY_TOKEN

# Set the region to '$region'
export AWS_REGION=$region

# Set the profile to '$profile_name'
export AWS_PROFILE=$profile_name
export AWS_DEFAULT_PROFILE=$profile_name

# Set the access key variables
export AWS_ACCESS_KEY=$aws_access_key_id
export AWS_ACCESS_KEY_ID=$aws_access_key_id

# Set the secret key variables
export AWS_SECRET_KEY=$aws_secret_access_key
export AWS_SECRET_ACCESS_KEY=$aws_secret_access_key

# Set the token variables
export AWS_TOKEN=$aws_session_token
export AWS_SESSION_TOKEN=$aws_session_token
export AWS_SECURITY_TOKEN=$aws_session_token

echo -e "$bldgrn\t.. Done!$txtrst\n"
