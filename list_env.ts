const relevantKeys = Object.keys(process.env).filter(k => 
  k.includes('FIREBASE') || 
  k.includes('SERVICE') || 
  k.includes('GOOGLE')
);

const envReport = {};
relevantKeys.forEach(k => {
  envReport[k] = process.env[k];
});

console.log(JSON.stringify(envReport, null, 2));
