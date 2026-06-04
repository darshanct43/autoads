async function run() {
  const res = await fetch('https://darshan-autoads-storage.s3.amazonaws.com/');
  const text = await res.text();
  console.log(text.substring(0, 1000));
}
run();
