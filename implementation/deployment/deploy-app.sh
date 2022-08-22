# should be the same as the one specified in create-app.sh
random="chocolate"

# get to the top level of working tree
cd ../

# deploy honest node
git subtree push --prefix implementation "$random-honest-node-1" master &

# deploy dishonest hondes
for index in {1..7}
do
    name="$random-dishonest-node-$index"
    git subtree push --prefix implementation "$name" master &
done
