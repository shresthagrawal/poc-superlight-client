# should be the same as the one specified in create-app.sh
random="chocolate"

# set honest config
heroku config:set --app "$random-honest-node-1" HONEST=true DUMMY=false 

# set dishonest config
for index in {1..13}
do
    name="$random-dishonest-node-$index"
    heroku config:set --app "$name" HONEST=false DUMMY=false 
done