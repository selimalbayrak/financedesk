const fs = require('fs');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx')) { 
            results.push(file);
        }
    });
    return results;
}

const files = walk('./features');
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    content = content.replace(/>{s\.name}</g, '>{(s as any).account_code ? `${(s as any).account_code} - ${s.name}` : s.name}<');
    content = content.replace(/>{acc\.name}</g, '>{(acc as any).account_code ? `${(acc as any).account_code} - ${acc.name}` : acc.name}<');
    content = content.replace(/>{a\.name}</g, '>{(a as any).account_code ? `${(a as any).account_code} - ${a.name}` : a.name}<');
    content = content.replace(/>{warehouse\.name}</g, '>{(warehouse as any).account_code ? `${(warehouse as any).account_code} - ${warehouse.name}` : warehouse.name}<');
    content = content.replace(/>{w\.name}</g, '>{(w as any).account_code ? `${(w as any).account_code} - ${w.name}` : w.name}<');
    content = content.replace(/>{safe\.name}</g, '>{(safe as any).account_code ? `${(safe as any).account_code} - ${safe.name}` : safe.name}<');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Updated ' + file);
    }
}
