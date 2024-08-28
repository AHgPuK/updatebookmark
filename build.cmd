@echo off

set SOURCE_DIR=.
set OUTPUT_DIR=build
set PACKAGE_NAME=UpdateBookmark

for /f %%i in ('hg id -r "tag('re:^v1.') and ancestors(.)" -t') do set VERSION=%%i

set VERSION=%VERSION:~1%

rem for /F "tokens=1,2 delims=/ " %%a in ("%VERSION%") do (
rem 	set VERSION=%%b
rem )

echo %VERSION%

rem jar cvfM %OUTPUT_DIR%\%PACKAGE_NAME%-%VERSION%.zip -C %SOURCE_DIR% icons popup options background.js manifest.json
set ARCHIVE_NAME=%OUTPUT_DIR%\Firefox-%PACKAGE_NAME%-%VERSION%.zip
7za a -tzip %ARCHIVE_NAME% icons common popup options background.js manifest.json

REM   -- Now we build for chrome
echo   ------------- Generate manifest -----------------
powershell -File .\generate.chrome.manifest.ps1
set ARCHIVE_NAME=%OUTPUT_DIR%\Chrome-%PACKAGE_NAME%-%VERSION%.zip
del %ARCHIVE_NAME% /Q
7za a -tzip %ARCHIVE_NAME% icons common popup options background.js manifest.chrome.json
7za rn %ARCHIVE_NAME% manifest.chrome.json manifest.json

del manifest.chrome.json /Q

pause
