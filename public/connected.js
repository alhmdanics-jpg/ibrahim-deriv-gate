document.getElementById("logout").addEventListener("click",async()=>{await fetch("/logout",{method:"POST"});location.href="/";});
