# get to the top level of working tree
cd ../

# deploy honest node
git subtree push --prefix implementation honest-node-1 master

# deploy dishonest hondes
for index in {1..13}
do
    name="dishonest-node-$index"
    git subtree push --prefix implementation "$name" master
done
