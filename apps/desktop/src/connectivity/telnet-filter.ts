const IAC=0xff,SB=0xfa,SE=0xf0,WILL=0xfb,WONT=0xfc,DO=0xfd,DONT=0xfe;
type State="data"|"iac"|"option"|"sub"|"sub-iac";

export class TelnetFilter{
  #state:State="data";
  push(input:Uint8Array):Uint8Array{
    const output:number[]=[];
    for(const byte of input){
      if(this.#state==="data"){if(byte===IAC)this.#state="iac";else output.push(byte);continue;}
      if(this.#state==="iac"){
        if(byte===IAC){output.push(IAC);this.#state="data";}
        else if(byte===WILL||byte===WONT||byte===DO||byte===DONT)this.#state="option";
        else if(byte===SB)this.#state="sub";
        else this.#state="data";
        continue;
      }
      if(this.#state==="option"){this.#state="data";continue;}
      if(this.#state==="sub"){if(byte===IAC)this.#state="sub-iac";continue;}
      if(byte===SE)this.#state="data";else if(byte!==IAC)this.#state="sub";
    }
    return Uint8Array.from(output);
  }
}
