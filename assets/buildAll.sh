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

# Run the script that creates the inputTemplate.handlebars file for DOME variable
./assets/createInputTemplate.sh

# Run the script to package the app for electron
electron-packager . docent --out=dist --asar --ignore=dist --icon=docent_icon.ico --all
