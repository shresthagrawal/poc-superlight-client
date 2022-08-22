# should be the same as the one specified in create-app.sh
random="chocolate"

# set honest config
heroku ps:type performance-m --app "$random-honest-node-1" 

# set dishonest config
for index in {1..7}
do
    name="$random-dishonest-node-$index"
    heroku ps:type performance-m --app "$name" 
done