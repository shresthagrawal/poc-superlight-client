# Heroku puts all all the servers to sleep if they didn't serve 
# any requests. Hence this can be used to wake up all the servers

# ping honest node
curl https://honest-node-1.herokuapp.com/sync-committee/mmr -m 2

# deploy dishonest hondes
for index in {1..13}
do
    name="dishonest-node-$index"
    curl "https://$name.herokuapp.com/sync-committee/mmr" -m 2
done
