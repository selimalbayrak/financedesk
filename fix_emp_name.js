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
    
    // For emp.name ->
    content = content.replace(/>{emp\.name}</g, '>{(emp as any).chart_of_accounts?.code ? `${(emp as any).chart_of_accounts.code} - ${emp.name}` : emp.name}<');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Updated ' + file);
    }
}
