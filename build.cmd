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
7za a -tzip %OUTPUT_DIR%\%PACKAGE_NAME%-%VERSION%.zip icons common popup options background.js manifest.json

rem pause
