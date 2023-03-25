function buildUrl(path: string) {
  return `http://localhost:8080${path}`;
}

export async function postCall(
  path: string,
  data: any,
  headers: any
): Promise<any> {
  console.log('POST', buildUrl(path), JSON.stringify(data), headers);
  return await fetch(buildUrl(path), {
    method: 'POST',
    body: JSON.stringify(data),
    headers: headers || {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      return res.json();
    })
    .catch((error) => {
      console.error(error);
    });
}
