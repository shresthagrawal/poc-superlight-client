# just a random string to avoid name collision among heroku apps
random="chocolate"

# Create one honest node
name="$random-honest-node-1"
heroku create "$name" 
git remote add "$name" "https://git.heroku.com/$name.git"

# Create 13 dishonest nodes
for index in {1..13}
do
    name="$random-dishonest-node-$index"
    heroku create "$name"
    git remote add "$name" "https://git.heroku.com/$name.git"
done