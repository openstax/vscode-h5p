import * as os from 'os';
export function getIps(external:boolean=false):string[]{
  if(!external) return ['localhost'];
	const interfaces = os.networkInterfaces();
	return interfaces && Object.values(interfaces)
	  .flatMap((devInts) =>
		  devInts!.filter((int: { internal: any }) => !int.internal)
		  .filter((int: { family: string }) => int.family === 'IPv4').map((int: { address: any }) => int.address))
}
