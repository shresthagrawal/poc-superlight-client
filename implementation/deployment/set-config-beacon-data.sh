# set honest config
heroku config:set --app honest-node-1 HONEST=true DUMMY=false 

# set dishonest config
for index in {1..13}
do
    name="dishonest-node-$index"
    heroku config:set --app "$name" HONEST=false DUMMY=false 
done