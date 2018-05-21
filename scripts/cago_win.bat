@ECHO OFF

IF NOT "%1"=="" (
  GOTO :main
)

:usage
ECHO Usage: cago.bat <command> [flags]
ECHO "Options: [refresh-profiles | list-profiles | switch-profile | unset | version | init]
ECHO "Flags:   [--debug]"
GOTO exit

:main
REM Process command, which must be first argument
SET COMMAND=%1
SHIFT

rem Start with an empty value
set "FLAGS="

REM Now process remaining arguments as flags
:loop
IF NOT "%1" == "" (
  SET FLAGS=%FLAGS% %1
  SHIFT
  GOTO loop
)

IF "%COMMAND%" == "refresh-profiles" (
  cago refresh-profiles %FLAGS%

  goto exit
)

IF "%COMMAND%" == "list-profiles" (
  cago list-profiles %FLAGS%

  goto exit
)

IF "%COMMAND%" == "switch-profile" (
  set TMPFILE=%HOMEPATH%\.cago\cago.profile.txt

  REM This is ye old windoze... need to write the command output to a temp file and bring back in as variable

  REM - It seems 'cago choose-profile' does not work when the output is redirected to file. User does not see anything
  REM - if you redirect only stderr, you get the error Unable to write profile to (C:\Users\210057070\.cago\cago.profile.txt): open C:\Users\210057070\.cago\cago.profile.txt: The process cannot access the file because it is being used by another process.
  REM cago choose-profile %FLAGS% > %TMPFILE%
  REM set /p AWS_PROFILE= < %TMPFILE%
  REM del %TMPFILE%

  rem Yasen: 09-Mar-2018 - workaround to how we supply profile name (remove all spaces)
  set AWS_PROFILE=%FLAGS: =%
  REM setx AWS_PROFILE %AWS_PROFILE%
  set "FLAGS="

  cago get-profile-key %AWS_PROFILE% aws_access_key_id > %TMPFILE%
  rem echo "Content of TMP file is"
  rem type %TMPFILE%
  set /p AWS_ACCESS_KEY_ID= < %TMPFILE%

  cago get-profile-key %AWS_PROFILE% aws_secret_access_key > %TMPFILE%
  set /p AWS_SECRET_ACCESS_KEY= < %TMPFILE%

  cago get-profile-key %AWS_PROFILE% aws_session_token > %TMPFILE%
  set /p AWS_SESSION_TOKEN= < %TMPFILE%

  del %TMPFILE%
  goto exit
)

IF "%COMMAND%" == "unset" (
  set "AWS_PROFILE="
  set "AWS_ACCESS_KEY_ID="
  set "AWS_SECRET_ACCESS_KEY="
  set "AWS_SESSION_TOKEN="

  goto exit
)

IF "%COMMAND%" == "version" (
  cago version %FLAGS%

  goto exit
)

IF "%COMMAND%" == "init" (
  REM First set the environment variable that points to the remote config file
  set CAGO_CONFIG_URL=https://cago-remote.mycompany.com/cago.yaml
  setx CAGO_CONFIG_URL %CAGO_CONFIG_URL%

  REM The define the shortcuts to run Cago
  doskey cagor=cago_win refresh-profiles
  doskey cagol=cago_win list-profiles
  doskey cagos=cago_win switch-profile

  goto exit
)

REM If we get here, we didn't understand the command
GOTO usage

:exit
