async function main() {
  const res = await fetch(`http://127.0.0.1:8000/status`);
  console.log("No Token Status:", res.status);
  console.log("No Token Body:", await res.text());
}
main();
