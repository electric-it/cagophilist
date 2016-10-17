# Cagophilist

--------------------------------------------------------------------------------

_1) A collector of or a fondness for collecting keys._

_2) A toolbelt for easily managing AWS keys for those that need to switch between roles while using the SDK or CLI._

**Important Features:**

- Configurable menu (friendly account names!)
- Scrolling menu (looks nice!)
- Colors (very nice!)
- Fast switching of active profiles (convenient!)
- One command update of all expired tokens (very convenient!)
- Modular design (works with alternate identity providers!)
- Supports custom plugins (for alternate identity providers!)
- Written in Node (if that's important to you...)

# Install

1. Install node v4.3.2 or above
2. Clone this repo and `cd /path/to/cagophilist`
3. `npm i`
4. Install or link globally:

  - Install globally: `npm install -g ./`
  - Link globally: `npm link`

5. Add the cagophilist options file: `~/.cagorc` [see the different settings below]

  - For Windows users, add the `.cagorc` file to `C:\Users\<your user>\.cagorc`

# Configure

To disable auto copying of the cagophilist source command to the clipboard, add `"autocopy": false` to the .cagorc config.

**Using settings for roles**

```json
    {
      "rc_version": "1.1.0",
      "autocopy": true,
      "aws": {
        "region": "us-east-1",
        "outputFormat": "json",
        "credentialsPath": "~/.aws/credentials",
        "rolesSource": "settings",
        "useHttpsProxy": true,
        "refreshMinutes": 10
      },
      "roles": [{
        "roleArn": "arn:aws:iam::123456789012:role/S3-FullAccess",
        "roleSessionName": "MyCorp-S3-FullAccess"
      }, {
        "roleArn": "arn:aws:iam::123456789013:role/S3-ReadOnly",
        "roleSessionName": "MyCorp-S3-ReadOnly"
      }, {
        "roleArn": "arn:aws:iam::123456789014:role/EC2-Access",
        "roleSessionName": "MyCorp-EC2-Access"
      }, {
        "roleArn": "arn:aws:iam::123456789012:role/Test-Role",
        "roleSessionName": "MyCorp-Test-Role"
      }, {
        "roleArn": "arn:aws:iam::123456789015:role/S3-FullAccess",
        "roleSessionName": "MyCorp-S3-FullAccess"
      }],
      "accounts": {
        "123456789012": "Production",
        "123456789013": "Stage",
        "123456789014": "Development",
        "123456789015": "EU Production"
      },
      "regions": {
        "123456789015": "eu-west-1"
      }
    }
```

**Using plugin for roles**

```json
    {
      "rc_version": "1.1.0",
      "autocopy": true,
      "aws": {
        "region": "us-east-1",
        "outputFormat": "json",
        "credentialsPath": "~/.aws/credentials",
        "rolesSource": "settings",
        "useHttpsProxy": true,
        "refreshMinutes": 10
      },
      "accounts": {
        "123456789012": "Production",
        "123456789013": "Stage",
        "123456789014": "Development",
        "123456789015": "EU Production"
      },
      "regions": {
        "123456789015": "eu-west-1"
      },
      "plugins": {
        "cago-custom-idp": "cago-custom-idp@1.0.0 --registry https://my.corp.com/artifactory/api/npm/custom-repo"
      },
      "config": {
        "cago-custom-idp": {
          "url": "... link to my.corp.com identity solution ...",
          "targetUrl": "... link to aws to get roles ...",
          "prompt": {
            "username": "Acct:",
            "password": "Pass:"
          }
        }
      }
    }
```

# Custom Plugin Development

[Plugin Development Guide](./docs/plugins.md)

# Use

If you've linked or installed Cagophilist globally, you can use `cago update`.

## Adding a new profile

Cagophilist can add a new AWS profile

1. `cago update`
2. Authenticate
3. Choose a role to use for the profile
4. Select 'Create a new profile'
5. Enter in a name for the new profile
6. Done!

## Reconfigure a new profile

Cagophilist can reconfigure an existing AWS profile to use a specific role

1. `cago update`
2. Authenticate
3. Choose a role to use for the profile
4. Choose an existing AWS profile to use for the role
5. Done!

## Refresh the tokens in all of your profiles

Cagophilist can be used to refresh all of the tokens for all of your AWS profiles

1. `cago refresh`
2. Authenticate
3. For any profiles not already mapped to a role - Choose the role
4. Done!

## Using a profile

Cagophilist can configure your shell environment variables for a specific AWS profile. Note: This functionality is somewhat dependant on Bash. Keep that in mind if you're using another shell.

1. `source $(cago env update) <profile-name>`
2. Done!

## Issues

Feel free to submit issues and enhancement requests.

**_NOTE:_** Add your system info to the issue from the output of the environment versions command: `cago env versions`

## Contributing

Please follow the "fork-and-pull" Git workflow.

1. **Fork** the repo on GitHub
2. **Clone** the project to your own machine
3. **Commit** changes to your own branch
4. Ensure **Tests** are written to cover your changes
5. **Push** your work back up to your fork
6. Submit a **Pull request** so that we can review your changes

**_NOTE:_** Be sure to merge the latest from "upstream" before making a pull request!

## License
Copyright (c) 2016, General Electric Company. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of General Electric Company or its subsidiaries nor the names of their contributors, or any trademarks of General Electric Company or its subsidiaries may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
