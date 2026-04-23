import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import AutocompleteGuard from "@/components/AutocompleteGuard";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "App Manager Pro",
  description: "Ultimate dashboard for managing developer accounts and apps.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  function harden(el){
    if(!el || el.nodeType!==1) return;
    var tag=el.tagName;
    if(tag==='FORM'){ el.setAttribute('autocomplete','off'); return; }
    if(tag==='INPUT'){
      var t=(el.getAttribute('type')||'text').toLowerCase();
      if(t==='file'||t==='checkbox'||t==='radio'||t==='submit'||t==='button'||t==='hidden') return;
      el.setAttribute('autocomplete', t==='password'?'new-password':'off');
      el.setAttribute('data-lpignore','true');
      el.setAttribute('data-form-type','other');
      el.setAttribute('data-1p-ignore','true');
      return;
    }
    if(tag==='TEXTAREA'||tag==='SELECT'){
      el.setAttribute('autocomplete','off');
      el.setAttribute('data-lpignore','true');
    }
  }
  function scan(root){
    if(!root||!root.querySelectorAll) return;
    var list=root.querySelectorAll('form,input,textarea,select');
    for(var i=0;i<list.length;i++) harden(list[i]);
  }
  var mo=new MutationObserver(function(muts){
    for(var i=0;i<muts.length;i++){
      var m=muts[i];
      for(var j=0;j<m.addedNodes.length;j++){
        var n=m.addedNodes[j];
        harden(n);
        scan(n);
      }
    }
  });
  function start(){ scan(document); if(document.body) mo.observe(document.body,{childList:true,subtree:true}); }
  if(document.body) start();
  else document.addEventListener('DOMContentLoaded', start, {once:true});
  var earlyMo=new MutationObserver(function(){ if(document.body){ earlyMo.disconnect(); start(); } });
  earlyMo.observe(document.documentElement,{childList:true,subtree:true});
})();
`,
          }}
        />
      </head>
      <body>
        <AutocompleteGuard />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
