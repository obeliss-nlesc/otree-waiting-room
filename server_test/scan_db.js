const userdb = require('../data/userdb.json')

const maxUsers = 999

const userIds = []

for (let i = 0; i < maxUsers; i++) {
  const base = 1000
  userIds.push(base + i)
}

usersInDb = userdb.map(u => {
  return u.userId
})

const A = new Set(userIds)
const B = new Set(usersInDb)


const symmetricDifference = (setA, setB) => {
    const difference = new Set([...setA].filter(x => !setB.has(x)));
    [...setB].forEach(x => {
        if (!setA.has(x)) {
            difference.add(x);
        }
    });
    return difference;
};

// Example usage
// const set1 = new Set([1, 2, 3, 4]);
// const set2 = new Set([3, 4, 5, 6]);

const symDiff = symmetricDifference(A, B);
console.log(symDiff); // Output: Set { 1, 2, 5, 6 }

