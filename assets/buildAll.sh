#! /bin/bash
# Read in list of template files
# Remove new lines
# Create new variable
# Store in templates.js as a string
OUTPUT_FILE=./app/core/templates.js
rm "$OUTPUT_FILE"
TEMPLATES=./app/*Template.handlebars
for f in $TEMPLATES
do
  echo "Processing $f"
  TEMPLATE_NAME=$(basename "$f" ".handlebars")
  echo -n "$TEMPLATE_NAME=\"">> "$OUTPUT_FILE"
  tr -d '\n' < $f | tr -d '\r' | sed 's/"/\\"/g' >> "$OUTPUT_FILE"
  echo $'\";' >> "$OUTPUT_FILE"
done

# Add in the mra.css file
echo -n "mraCss=\"" >> "$OUTPUT_FILE"
tr -d '\n' < ./app/mra.css | tr -d '\r' | sed 's/"/\\"/g' >> "$OUTPUT_FILE"
echo $'\";' >> "$OUTPUT_FILE"

# Run the script that creates the encoded css template
node assets/createStartCss.js
# Add in the encoded file
echo -n "cssTemplate=\"" >> "$OUTPUT_FILE"
tr -d '\n' < ./assets/inputCss.txt | tr -d '\r' | sed 's/"/\\"/g' >> "$OUTPUT_FILE"
echo $'\";' >> "$OUTPUT_FILE"

# Add in the help.js file
echo -n "helpItems=" >> "$OUTPUT_FILE"
#tr -d '\n' < ./app/help.js | tr -d '\r' | sed 's/"/\\"/g' >> "$OUTPUT_FILE"
tr -d '\n' < ./app/help.js | tr -d '\r' | tr -s " " >> "$OUTPUT_FILE"

# Run the script that creates the inputTemplate.handlebars file for DOME variable
./assets/createInputTemplate.sh

# Run the script to package the app for electron
./node_modules/.bin/electron-packager . docent --out=dist --asar --ignore=dist --icon=docent_icon.ico --all
