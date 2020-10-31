ar = [];
for (let i = 0; i < 10; i++) {
    ar[i] = i;
}

ar.sort(function () {
    return Math.random() - 0.5;
});

console.log(ar);
console.log(ar.length);
