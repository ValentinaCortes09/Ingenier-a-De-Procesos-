const inputField = document.getElementById('mathInput');
const historyDisplay = document.getElementById('historyDisplay');
const resultDisplay = document.getElementById('resultDisplay');
const stepDisplay = document.getElementById('stepDisplay');
const plotDiv = document.getElementById('plotDiv');

// --- Keyboard Logic ---

function switchTab(tabName) {
    document.querySelectorAll('.keyboard-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    const tabs = ['basic', 'func', 'calc', 'matrix', 'greek'];
    document.querySelectorAll('.tab-btn')[tabs.indexOf(tabName)].classList.add('active');
}

function insertSymbol(symbol) {
    const startPos = inputField.selectionStart;
    const endPos = inputField.selectionEnd;
    const val = inputField.value;
    inputField.value = val.substring(0, startPos) + symbol + val.substring(endPos);
    inputField.setSelectionRange(startPos + symbol.length, startPos + symbol.length);
    inputField.focus();
}

function backspace() {
    const startPos = inputField.selectionStart;
    const endPos = inputField.selectionEnd;
    const val = inputField.value;
    if (startPos === endPos && startPos > 0) {
        inputField.value = val.substring(0, startPos - 1) + val.substring(endPos);
        inputField.setSelectionRange(startPos - 1, startPos - 1);
    } else {
        inputField.value = val.substring(0, startPos) + val.substring(endPos);
        inputField.setSelectionRange(startPos, startPos);
    }
    inputField.focus();
}

function clearAll() {
    inputField.value = '';
    resultDisplay.innerHTML = '';
    stepDisplay.innerHTML = '';
    Plotly.purge(plotDiv);
    inputField.focus();
}

inputField.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        calculate();
    }
});



function calculate() {
    const expr = inputField.value.trim();
    if (!expr) return;

    historyDisplay.textContent = expr;
    stepDisplay.innerHTML = '';
    resultDisplay.innerHTML = '';
    Plotly.purge(plotDiv);

    try {
        // 1. Calculus Operations (using Nerdamer)
        if (expr.includes('integrate(') || expr.includes('∫')) {
            handleIntegration(expr);
            return;
        }
        if (expr.includes('diff(') || expr.includes('derivative(')) {
            handleDifferentiation(expr);
            return;
        }
        if (expr.includes('limit(')) {
            handleLimit(expr);
            return;
        }
        if (expr.includes('simplify(')) {
            handleSimplify(expr);
            return;
        }
        if (expr.includes('expand(')) {
            handleExpand(expr);
            return;
        }
        if (expr.includes('factor(')) {
            handleFactor(expr);
            return;
        }
        if (expr.includes('solve(')) {
            handleSolve(expr);
            return;
        }

        // 2. Implicit Graphing
        const hasVars = /[xyz]/.test(expr);
        const isFunctionCall = /[a-z]+\(/.test(expr);
        
        if (hasVars && !isFunctionCall) {
            handleGraphing(expr);
            const simplified = nerdamer(expr).simplify().toString();
            stepDisplay.innerHTML = `Function detected. Simplified form:`;
            resultDisplay.innerHTML = `$$ f(x) = ${nerdamer(simplified).toTeX()} $$`;
            MathJax.typesetPromise([resultDisplay]);
            return;
        }

        // 3. Basic Evaluation (using Math.js)
        const result = math.evaluate(expr);
        
        if (typeof result === 'number') {
            stepDisplay.innerHTML = `Numerical evaluation:`;
            resultDisplay.innerHTML = `$$ = ${result} $$`;
            MathJax.typesetPromise([resultDisplay]);
        } else if (typeof result === 'object' && result.isMatrix) {
            stepDisplay.innerHTML = `Matrix result:`;
            const latexRes = math.parse(result.toString()).toTex();
            resultDisplay.innerHTML = `$$ = ${latexRes} $$`;
            MathJax.typesetPromise([resultDisplay]);
        } else {
            resultDisplay.innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
        }

    } catch (error) {
        resultDisplay.innerHTML = `<span style="color:red">Error: ${error.message}</span>`;
        stepDisplay.innerHTML = `Operation failed. Check syntax.`;
    }
}

// --- Calculus Functions using Nerdamer ---

function handleIntegration(expr) {
    try {
        // Extract content inside integrate(...)
        const match = expr.match(/integrate\(([^)]+)\)/);
        if (!match) throw new Error("Invalid syntax. Use: integrate(expression)");
        
        const content = match[1];
        
        // Use Nerdamer for symbolic integration
        const result = nerdamer(`integrate(${content}, x)`);
        const resultTeX = result.toTeX();
        
        stepDisplay.innerHTML = `Computing indefinite integral with respect to <i>x</i>:`;
        resultDisplay.innerHTML = `$$ \\int ${nerdamer(content).toTeX()} \\, dx = ${resultTeX} + C $$`;
        MathJax.typesetPromise([resultDisplay]);
        
        // Try to graph if it's a function of x
        if (!content.includes('y') && !content.includes('z')) {
            setTimeout(() => graphFunction(content), 500);
        }
        
    } catch (e) {
        resultDisplay.innerHTML = `<span style="color:red">Integration Error: ${e.message}</span>`;
        stepDisplay.innerHTML = `Symbolic integration failed.`;
    }
}

function handleDifferentiation(expr) {
    try {
  
        const match = expr.match(/diff\(([^)]+)\)/) || expr.match(/derivative\(([^)]+)\)/);
        if (!match) throw new Error("Invalid syntax. Use: diff(expression)");
        
        const content = match[1];
        
        // Use Nerdamer for symbolic differentiation
        const result = nerdamer(`diff(${content}, x)`);
        const resultTeX = result.toTeX();
        
        stepDisplay.innerHTML = `Computing derivative with respect to <i>x</i>:`;
        resultDisplay.innerHTML = `$$ \\frac{d}{dx}\\left(${nerdamer(content).toTeX()}\\right) = ${resultTeX} $$`;
        MathJax.typesetPromise([resultDisplay]);
        
        
        if (!content.includes('y') && !content.includes('z')) {
            setTimeout(() => graphFunction(content), 500);
        }
        
    } catch (e) {
        resultDisplay.innerHTML = `<span style="color:red">Differentiation Error: ${e.message}</span>`;
        stepDisplay.innerHTML = `Symbolic differentiation failed.`;
    }
}

function handleLimit(expr) {
    try {
    
        const match = expr.match(/limit\(([^)]+)\)/);
        if (!match) throw new Error("Use: limit(expression, x, value)");
        
        const content = match[1];
        const result = nerdamer(`limit(${content})`);
        
        stepDisplay.innerHTML = `Computing limit:`;
        resultDisplay.innerHTML = `$$ \\lim ${content} = ${result.toTeX()} $$`;
        MathJax.typesetPromise([resultDisplay]);
        
    } catch (e) {
        resultDisplay.innerHTML = `<span style="color:red">Limit Error: ${e.message}</span>`;
    }
}

function handleSimplify(expr) {
    try {
        const match = expr.match(/simplify\(([^)]+)\)/);
        if (!match) throw new Error("Use: simplify(expression)");
        
        const content = match[1];
        const result = nerdamer(content).simplify();
        
        stepDisplay.innerHTML = `Simplifying expression:`;
        resultDisplay.innerHTML = `$$ ${nerdamer(content).toTeX()} = ${result.toTeX()} $$`;
        MathJax.typesetPromise([resultDisplay]);
        
    } catch (e) {
        resultDisplay.innerHTML = `<span style="color:red">Simplify Error: ${e.message}</span>`;
    }
}

function handleExpand(expr) {
    try {
        const match = expr.match(/expand\(([^)]+)\)/);
        if (!match) throw new Error("Use: expand(expression)");
        
        const content = match[1];
        const result = nerdamer(content).expand();
        
        stepDisplay.innerHTML = `Expanding expression:`;
        resultDisplay.innerHTML = `$$ ${result.toTeX()} $$`;
        MathJax.typesetPromise([resultDisplay]);
        
    } catch (e) {
        resultDisplay.innerHTML = `<span style="color:red">Expand Error: ${e.message}</span>`;
    }
}

function handleFactor(expr) {
    try {
        const match = expr.match(/factor\(([^)]+)\)/);
        if (!match) throw new Error("Use: factor(expression)");
        
        const content = match[1];
        const result = nerdamer(content).factor();
        
        stepDisplay.innerHTML = `Factoring expression:`;
        resultDisplay.innerHTML = `$$ ${result.toTeX()} $$`;
        MathJax.typesetPromise([resultDisplay]);
        
    } catch (e) {
        resultDisplay.innerHTML = `<span style="color:red">Factor Error: ${e.message}</span>`;
    }
}

function handleSolve(expr) {
    try {
        const match = expr.match(/solve\(([^)]+)\)/);
        if (!match) throw new Error("Use: solve(equation, variable)");
        
        const content = match[1];
        const result = nerdamer.solve(content);
        
        stepDisplay.innerHTML = `Solving equation:`;
        resultDisplay.innerHTML = `$$ ${result.map(r => r.toTeX()).join(', ')} $$`;
        MathJax.typesetPromise([resultDisplay]);
        
    } catch (e) {
        resultDisplay.innerHTML = `<span style="color:red">Solve Error: ${e.message}</span>`;
    }
}

// --- Graphing Functions ---

function graphFunction(expr) {
    try {
        const node = math.parse(expr);
        const code = node.compile();

        const hasY = expr.includes('y');
        const hasZ = expr.includes('z');

        if (hasY || hasZ) {
            // 3D Surface Plot
            const xRange = math.range(-5, 5, 0.5).toArray();
            const yRange = math.range(-5, 5, 0.5).toArray();
            const zValues = [];

            for (let y of yRange) {
                const row = [];
                for (let x of xRange) {
                    try {
                        const val = code.evaluate({ x: x, y: y, z: 0 }); 
                        row.push(isFinite(val) ? val : null);
                    } catch (e) { row.push(null); }
                }
                zValues.push(row);
            }

            const trace = {
                z: zValues,
                x: xRange,
                y: yRange,
                type: 'surface',
                colorscale: 'Viridis'
            };

            const layout = {
                title: `3D Surface: ${expr}`,
                scene: { xaxis: {title:'x'}, yaxis: {title:'y'}, zaxis: {title:'z'} },
                margin: { l: 0, r: 0, b: 0, t: 40 }
            };

            Plotly.newPlot(plotDiv, [trace], layout, {responsive: true});
            
        } else {
            // 2D Plot
            const xValues = [];
            const yValues = [];
            
            for (let x = -10; x <= 10; x += 0.1) {
                try {
                    const y = code.evaluate({ x: x });
                    if (isFinite(y)) {
                        xValues.push(x);
                        yValues.push(y);
                    }
                } catch (e) { continue; }
            }

            const trace = {
                x: xValues,
                y: yValues,
                mode: 'lines',
                line: { color: '#2196F3', width: 3 },
                type: 'scatter'
            };

            const layout = {
                title: `Graph: ${expr}`,
                xaxis: { title: 'x', zeroline: true, gridcolor: '#eee' },
                yaxis: { title: 'y', zeroline: true, gridcolor: '#eee' },
                margin: { t: 40, r: 20, l: 40, b: 40 }
            };

            Plotly.newPlot(plotDiv, [trace], layout, {responsive: true});
        }
    } catch (e) {
        console.error("Graphing error:", e);
    }
}

function handleGraphing(expr) {
    graphFunction(expr);
}