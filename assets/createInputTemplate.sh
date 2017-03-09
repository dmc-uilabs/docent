#! /bin/bash
cat ./app/headerTemplate.handlebars ./app/startTemplate.handlebars ./app/footerTemplate.handlebars > tempFile1.txt
tr -d '\n' < tempFile1.txt > ./assets/inputTemplate.handlebars
sed -i 's/{{mraOutputs.mraCss}}/{{startCss}}/g' ./assets/inputTemplate.handlebars
rm tempFile1.txt
