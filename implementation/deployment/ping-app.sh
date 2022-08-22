# Heroku puts all all the servers to sleep if they didn't serve 
# any requests. Hence this can be used to wake up all the servers

# should be the same as the one specified in create-app.sh
random="chocolate"

# ping honest node
curl "https://$random-honest-node-1.herokuapp.com/sync-committee/mmr" -m 2

# deploy dishonest hondes
for index in {1..7}
do
    name="$random-dishonest-node-$index"
    curl "https://$name.herokuapp.com/sync-committee/mmr" -m 2
done
