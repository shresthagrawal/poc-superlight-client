# Create one honest node
heroku create "honest-node-1"
git remote add "$name" "https://git.heroku.com/honest-node-1.git"

# Create 13 dishonest nodes
for index in {1..13}
do
    name="dishonest-node-$index"
    heroku create "$name"
    git remote add "$name" "https://git.heroku.com/$name.git"
done