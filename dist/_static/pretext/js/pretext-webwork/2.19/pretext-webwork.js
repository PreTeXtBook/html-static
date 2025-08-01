//Critical:
// TODO: Think about what should be done for an essay question.

//Accessibility:

//Enhancement:
// TODO: Have randomize check that new seed is actually producing new HTML.
// TODO: Don't offer randomize button unless we know a new version can be produced after trying a few seeds.

//Styling:
// TODO: Review all styling in all scenarios (staged/not, correct/partly-correct/incorrect/blank, single/multiple)

async function handleWW(ww_id, action) {
    const ww_container = document.getElementById(ww_id);
    const ww_domain = ww_container.dataset.domain;
    const ww_processing = 'webwork2';
    const ww_origin = ww_container.dataset.origin;
    const ww_problemSource = ww_container.dataset.problemsource;
    const ww_sourceFilePath = ww_container.dataset.sourcefilepath;
    const ww_course_id = ww_container.dataset.courseid;
    const ww_user_id = ww_container.dataset.userid;
    const ww_passwd = ww_container.dataset.coursepassword;
    const localize_submit = ww_container.dataset.localizeSubmit || "Submit";
    const localize_check_responses = ww_container.dataset.localizeCheckResponses || "Check Responses";
    const localize_reveal = ww_container.dataset.localizeReveal || "Reveal";
    const localize_randomize = ww_container.dataset.localizeRandomize || "Randomize";
    const localize_reset = ww_container.dataset.localizeReset || "Reset";
    const runestone_logged_in = (typeof eBookConfig !== 'undefined' && eBookConfig.username !== '');
    // will be null on pages generated prior to late December 2022
    const activate_button = document.getElementById(ww_id + '-button')

    // Set the current seed
    if (!action) {
        ww_container.dataset.current_seed = ww_container.dataset.seed;
        if (runestone_logged_in) {
            ww_container.dataset.current_seed = webworkSeedHash(eBookConfig.username + ww_container.dataset.current_seed);
        }
    }
    else if (action == 'randomize') ww_container.dataset.current_seed = Number(ww_container.dataset.current_seed) + 100;

    let loader = document.createElement('div');
    loader.style.position = 'absolute';
    loader.style.left = 0;
    loader.style.top = 0;
    loader.style.backgroundColor = 'rgba(0.2, 0.2, 0.2, 0.4)';
    loader.style.color = 'white';
    loader.style.width = '100%';
    loader.style.height = '100%';
    loader.style.display = 'flex';
    loader.style.alignItems = 'center';
    loader.style.justifyContent = 'center';
    loader.style.marginTop = '0';
    loader.tabIndex = -1;
    const loaderText = document.createElement('span');
    loaderText.textContent = 'Loading';
    loaderText.style.fontSize = '2rem';
    loader.appendChild(loaderText);
    ww_container.appendChild(loader);
    loader.focus();

    if (!action) {
        // Determine if static version shows hints, solutions, or answers and save that information in the container dataset for later runs.
        ww_container.dataset.hasHint = ww_container.getElementsByClassName('hint').length > 0;
        ww_container.dataset.hasSolution = ww_container.getElementsByClassName('solution').length > 0;
        ww_container.dataset.hasAnswer = ww_container.getElementsByClassName('answer').length > 0;
        // Get (possibly localized) label text for hints and solutions.
        ww_container.dataset.hintLabelText = ww_container.dataset.hasHint == 'true'
            ? ww_container.querySelectorAll('.hint-knowl span.type, details.hint span.type')[0].textContent : 'Hint';
        ww_container.dataset.solutionLabelText = ww_container.dataset.hasSolution == 'true'
            ? ww_container.querySelectorAll('.solution-knowl span.type, details.solution span.type')[0].textContent : 'Solution';

        ww_container.tabIndex = -1;
    }

    let url;
    if (ww_processing == 'webwork2') {
        url = new URL(ww_domain + '/webwork2/render_rpc');
    }
    let formData = new FormData();

    if (action == 'check' || action =='reveal') {
        const iframe = ww_container.querySelector('.problem-iframe');
        formData = new FormData(iframe.contentDocument.getElementById(ww_id + "-form"));
        formData.set("answersSubmitted", '1');
        formData.set('WWsubmit', "1");
        if (action == 'reveal' && ww_container.dataset.hasAnswer == 'true') {
            formData.set('WWcorrectAnsOnly', "1");
        }
        if (ww_origin == 'generated') {
            const rawProblemSource = await fetch('generated/webwork/pg/' + ww_problemSource).then((r) => r.text());
            formData.set("rawProblemSource", rawProblemSource);
        }
        else if (ww_origin == 'webwork2') formData.set("sourceFilePath", ww_sourceFilePath);
    } else {
        formData.set("problemSeed", ww_container.dataset.current_seed);
        if (ww_origin == 'generated') {
            const rawProblemSource = await fetch('generated/webwork/pg/' + ww_problemSource).then((r) => r.text());
            formData.set("rawProblemSource", rawProblemSource);
        }
        else if (ww_origin == 'webwork2') formData.set("sourceFilePath", ww_sourceFilePath);
        formData.set("answersSubmitted", '0');
        formData.set("displayMode", "MathJax");
        formData.set("courseID", ww_course_id);
        formData.set("user", ww_user_id);
        formData.set("userID", ww_user_id);
        formData.set("passwd", ww_passwd);
        formData.set("disableCookies", '1');
        formData.set("outputformat", "raw");
        // note ww_container.dataset.hasSolution is a string, possibly 'false' which is true
        formData.set("showSolutions", ww_container.dataset.hasSolution == 'true' ? '1' : '0');
        formData.set("showHints", ww_container.dataset.hasHint == 'true' ? '1' : '0');
        formData.set("problemUUID",ww_id);
    }

    // If in Runestone, check if there are previous answer submissions and get them now to use in the form.
    let checkboxesString = '';
    if (runestone_logged_in && !action) {
        const answersObject = (wwList[ww_id.replace(/-ww-rs$/,'')].answers ? wwList[ww_id.replace(/-ww-rs$/,'')].answers : {'answers' : [], 'mqAnswers' : []});
        const previousAnswers = answersObject.answers;
        if (previousAnswers !== null) {
            formData.set('WWsubmit', 1);
        }
        for (const answer in previousAnswers) {
            if (previousAnswers[answer].constructor === Array) {
                for (const k in previousAnswers[answer]) {
                    checkboxesString += '&';
                    checkboxesString += answer;
                    checkboxesString += '=';
                    checkboxesString += previousAnswers[answer][k];
                }
            } else {
                formData.set(answer, previousAnswers[answer]);
            }
        }
    }
    // Need to get form data as a string, including possible repeated checkbox names
    // Do not pass post data as an object, or checkbox names will overwrite one another
    const formString = new URLSearchParams(formData).toString();

    $.post(url, formString + checkboxesString, (data) => {
        // Create the form that will contain the text and input fields of the interactive problem.
        const form = document.createElement("form");
        form.id = ww_id + "-form";
        form.dataset.iframeHeight = 1;

        // Create a div for the problem text.
        const body_div = document.createElement("div");
        body_div.id = ww_id + "-body";
        body_div.classList.add("exercise", "exercise-like");
        body_div.lang = data.lang;
        body_div.dir = data.dir;

        // Dump the problem text, answer blanks, etc.
        body_div.innerHTML = data.rh_result.text;

        // If showPartialCorrectAnswers = 0, alter the feedback buttons according to whether or not the score is 100%.
        if ('showPartialCorrectAnswers' in data.rh_result.flags && data.rh_result.flags.showPartialCorrectAnswers == 0) {
            if ('score' in data.rh_result.problem_result && data.rh_result.problem_result.score >= 1) {
                body_div.querySelectorAll('button.ww-feedback-btn').forEach(
                    function(button) {
                        button.classList.remove('btn-info');
                        button.classList.add('btn-success');
                        button.setAttribute('aria-label', 'Correct');
                        button.dataset.bsCustomClass = button.dataset.bsCustomClass + ' correct';
                        button.dataset.bsTitle = button.dataset.bsTitle.replace('Answer Preview', 'Correct');
                        button.firstChild.classList.add('correct')
                    }
                );
            } else {
                body_div.querySelectorAll('button.ww-feedback-btn').forEach(
                    function(button) {
                        button.setAttribute('aria-label', 'One or more answers incorrect');
                        button.dataset.bsTitle = button.dataset.bsTitle.replace('Answer Preview', 'One or more answers incorrect');
                    }
                );
            }
        }

        // Replace all hn headings with h6 headings.
        for (const tag_name of ['h6', 'h5', 'h4', 'h3', 'h2', 'h1']) {
            const headings = body_div.getElementsByTagName(tag_name);
            for (heading of headings) {
                const new_heading = document.createElement("h6");
                new_heading.innerHTML = heading.innerHTML;
                cloneAttributes(new_heading, heading);
                new_heading.classList.add('webwork-part');
                heading.replaceWith(new_heading);
            }
        }

        // Hide textarea input and hide associated buttons
        var textareas = body_div.getElementsByTagName("textarea");
        for(var i = 0, max = textareas.length; i < max; i++)
        {
            textareas[i].style.display = "none";
            textareas[i].className = '';
        }
        var textareabuttons = body_div.querySelectorAll(".latexentry-preview");
        for(var i = 0, max = textareabuttons.length; i < max; i++)
        {
            textareabuttons[i].remove();
        }

        adjustSrcHrefs(body_div, ww_domain);

        translateHintSol(ww_id, body_div, ww_domain,
            ww_container.dataset.hasHint == 'true', ww_container.dataset.hasSolution == 'true',
            ww_container.dataset.hintLabelText, ww_container.dataset.solutionLabelText)

        // insert previous answers
        if (runestone_logged_in) {
            const answersObject = (wwList[ww_id.replace(/-ww-rs$/,'')].answers ? wwList[ww_id.replace(/-ww-rs$/,'')].answers : {'answers' : [], 'mqAnswers' : []});
            const mqAnswers = answersObject.mqAnswers;
            for (const mqAnswer in mqAnswers) {
                const mqInput = body_div.querySelector('input[id=' + mqAnswer + ']');
                if (mqInput && mqInput.value == '') {
                    mqInput.setAttribute('value', mqAnswers[mqAnswer]);
                }
            }
            const answers = answersObject.answers;
            for (const answer in answers) {
                const input = body_div.querySelector('input[id=' + answer + ']');
                if (input && input.value == '') {
                    input.setAttribute('value', answers[answer]);
                }
            }
        }

        // insert our cleaned up problem text
        form.appendChild(body_div);

        // Set up hidden input fields that the form uses
        const wwInputs = {
            problemSeed:      data.inputs_ref.problemSeed,
            problemUUID:      data.inputs_ref.problemUUID,
            psvn:             data.inputs_ref.psvn,
            courseName:       ww_course_id,
            courseID:         ww_course_id,
            user:             ww_user_id,
            passwd:           ww_passwd,
            displayMode:      "MathJax",
            session_key:      data.rh_result.session_key,
            outputformat:     "raw",
            language:         data.formLanguage,
            showSummary:      data.showSummary,
            disableCookies:   '1',
            // note ww_container.dataset.hasSolution is a string, possibly 'false' which is true
            showSolutions:    ww_container.dataset.hasSolution == 'true' ? '1' : '0',
            showHints:        ww_container.dataset.hasHint == 'true' ? '1' : '0',
            forcePortNumber:  data.forcePortNumber
        };

        if (ww_sourceFilePath) wwInputs.sourceFilePath = ww_sourceFilePath;
        else if (ww_problemSource && ww_origin == 'webwork2') wwInputs.problemSource = ww_problemSource;

        for (const wwInputName of Object.keys(wwInputs)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = wwInputName;
            input.value = wwInputs[wwInputName];
            form.appendChild(input);
        }

        let buttonContainer = ww_container.querySelector('.problem-buttons.webwork');
        // Create the submission buttons if they have not yet been created.
        if (!buttonContainer) {
            // Hide the original div that contains the Activate.
            ww_container.querySelector('.problem-buttons').classList.add('hidden-content', 'hidden');

            // Create a new div for the webwork buttons.
            buttonContainer = document.createElement('div');
            buttonContainer.classList.add('problem-buttons', 'webwork');
            if (activate_button != null) {
                // Make sure the button container follows the activate button in the DOM
                activate_button.after(buttonContainer);
            } else {
                ww_container.prepend(buttonContainer);
            }

            // Check button
            const check = document.createElement("button");
            check.type = "button";
            check.id = ww_id + '-check';
            check.style.marginRight = "0.25rem";
            check.classList.add('webwork-button');

            check.textContent = runestone_logged_in ? localize_submit : localize_check_responses;

            check.addEventListener('click', () => handleWW(ww_id, "check"));

            buttonContainer.appendChild(check);

            // Show correct answers button if original PTX has answer knowl.
            if (ww_container.dataset.hasAnswer == 'true') {
                const correct = document.createElement("button");
                correct.classList.add("show-correct", 'webwork-button');
                correct.type = "button";
                correct.style.marginRight = "0.25rem";
                correct.textContent = localize_reveal;
                correct.addEventListener('click', () => handleWW(ww_id, 'reveal'));
                buttonContainer.appendChild(correct);
            }

            // randomize button
            const randomize = document.createElement("button")
            randomize.type = "button";
            randomize.classList.add('webwork-button');
            randomize.style.marginRight = "0.25rem";
            randomize.textContent = localize_randomize;
            randomize.addEventListener('click', () => handleWW(ww_id, 'randomize'));
            buttonContainer.appendChild(randomize)

            // reset button
            const reset = document.createElement("button")
            reset.type = "button"
            reset.classList.add('webwork-button');
            reset.textContent = localize_reset;
            reset.addEventListener('click', () => resetWW(ww_id));
            buttonContainer.appendChild(reset)
        }

        if (runestone_logged_in && action == 'check') {
            // Runestone trigger
            $("body").trigger('runestone_ww_check', data)
        }

        let iframeContents = '<!DOCTYPE html><head>' +
            '<script src="' + ww_domain + '/webwork2_files/node_modules/jquery/dist/jquery.min.js"></script>' +
            `<script>
                window.MathJax = {
                    tex: { packages: { '[+]': ['noerrors'] } },
                    loader: { load: ['input/asciimath', '[tex]/noerrors'] },
                    startup: {
                        ready() {
                            const AM = MathJax.InputJax.AsciiMath.AM;

                            // Modify existing AsciiMath triggers.
                            AM.symbols[AM.names.indexOf('**')] = {
                                input: '**',
                                tag: 'msup',
                                output: '^',
                                tex: null,
                                ttype: AM.TOKEN.INFIX
                            };

                            const i = AM.names.indexOf('infty');
                            AM.names[i] = 'infinity';
                            AM.symbols[i] = { input: 'infinity', tag: 'mo', output: '\u221E', tex: 'infty', ttype: AM.TOKEN.CONST };

                            return MathJax.startup.defaultReady();
                        }
                    },
                    options: {
                        processHtmlClass: "process-math",
                        renderActions: {
                            findScript: [
                                10,
                                (doc) => {
                                    for (const node of document.querySelectorAll('script[type^="math/tex"]')) {
                                        const math = new doc.options.MathItem(
                                            node.textContent,
                                            doc.inputJax[0],
                                            !!node.type.match(/; *mode=display/)
                                        );
                                        const text = document.createTextNode('');
                                        node.parentNode.replaceChild(text, node);
                                        math.start = { node: text, delim: '', n: 0 };
                                        math.end = { node: text, delim: '', n: 0 };
                                        doc.math.push(math);
                                    }
                                },
                                ''
                            ]
                        },
                        ignoreHtmlClass: 'tex2jax_ignore'
                    }
                };
            </script>` +
            '<script src="' + ww_domain + '/webwork2_files/node_modules/mathjax/es5/tex-chtml.js" id="MathJax-script" defer></script>' +
            '<script src="_static/pretext/js/lib/knowl.js" defer></script>' +
            '<link rel="stylesheet" href="' + ww_domain + '/webwork2_files/node_modules/bootstrap/dist/css/bootstrap.min.css"/>' +
            '<script src="' + ww_domain + '/webwork2_files/node_modules/bootstrap/dist/js/bootstrap.bundle.min.js" defer></script>';

        // Determine javascript and css dependencies
        const extra_css_files = [];
        const extra_js_files = [];

        if (data.extra_css_files) data.extra_css_files.unshift(...extra_css_files);
        else data.extra_css_files = extra_css_files;
        for (const cssFile of data.extra_css_files) {
            iframeContents += '<link rel="stylesheet" href="' + (cssFile.external !== '1' ? ww_domain : '') + cssFile.file + '"/>';
        }

        if (data.extra_js_files) data.extra_js_files.unshift(...extra_js_files);
        else data.extra_js_files = extra_js_files;
        for (const jsFile of data.extra_js_files) {
            iframeContents += '<script src="' + (jsFile.external !== '1' ? ww_domain : '') + jsFile.file + '" ' +
                Object.keys(jsFile.attributes || {}).reduce((ret, key) => {
                    ret += key + '="' + jsFile.attributes[key] + '" '; return ret;
                }, "") + '></script>';
        }

        iframeContents +=
            '<link rel="stylesheet" href="_static/pretext/css/theme.css"/>' +
            '<script src="' + ww_domain + '/webwork2_files/node_modules/iframe-resizer/js/iframeResizer.contentWindow.min.js"></script>' +
            `<style>
                html { overflow-y: hidden; }
                html body { background:unset; margin: 0; }
                body { font-size: initial; line-height: initial; padding:2px; }
                .hidden-content { display: none; }
                span.nobreak { white-space: nowrap; }
                div.PGML img.image-view-elt { max-width:100%; }
                .graphtool-answer-container .graphtool-graph { margin: 0; width: 300px; height: 300px; }
                .graphtool-answer-container .graphtool-number-line { height: 57px; }
                .quill-toolbar { scrollbar-width: thin; overflow-x: hidden; }
            </style>` +
            '</head><body>' +
            '<main class="pretext-content problem-content" data-iframe-height="1">' + form.outerHTML + '</main></body>' +
            '</html>';

        let iframe;
        // If there is no action this is the initialization call.
        if (!action) {
            // Create the iframe.
            iframe = document.createElement('iframe');
            iframe.style.width = '1px';
            iframe.style.minWidth = '100%';
            iframe.classList.add('problem-iframe');

            // Hide the static problem
            ww_container.querySelector('.problem-contents').classList.add('hidden-content', 'hidden');

            if (activate_button != null) {
                // Make sure the iframe follows the activate button in the DOM
                activate_button.after(iframe);
            } else {
                ww_container.prepend(iframe);
            }

            iFrameResize({ checkOrigin: false, scrolling: 'omit', heightCalculationMethod: 'taggedElement' }, iframe);

            iframe.addEventListener('load', () => {
                // Set up form submission from inside the iframe.
                const iframeForm = iframe.contentDocument.getElementById(ww_id + '-form');
                iframeForm.addEventListener('submit', (e) => {
                    handleWW(ww_id, "check");
                    e.preventDefault();
                });

                iframe.contentDocument.querySelectorAll('.collapse.in').forEach(collapse => collapse.classList.add('expanded'));
                iframe.contentWindow.jQuery('.collapse').on('shown', function(e) { if (e.target != this) return; this.classList.add('expanded'); });
                iframe.contentWindow.jQuery('.collapse').on('hide', function(e) { if (e.target != this) return; this.classList.remove('expanded'); });

                iframe.contentWindow.MathJax.startup.promise.then(() => iframe.contentWindow.MathJax.typesetPromise(['.popover', '.popover-content']));
            });
        } else {
            iframe = ww_container.querySelector('.problem-iframe');
        }

        iframe.srcdoc = iframeContents;

        iframe.addEventListener('load', () => {
            // Remove the loader overlay
            loader.remove();
        }, { once: true })

        // Place focus on the problem.
        ww_container.focus()
    }, "json");
}

function WWshowCorrect(ww_id, answers) {
    const ww_container = document.getElementById(ww_id);
    const iframe = ww_container.querySelector('.problem-iframe');

    const body = iframe.contentDocument.getElementById(ww_id + '-body')
    $("body").trigger("runestone_show_correct", {
        "ww_id": ww_id,
        "answers": answers
    });

    let inputs = body.querySelectorAll("input:not([type=hidden])");
    for (const input of inputs) {
        const name = input.name;
        const span_id = `${ww_id}-${name}-correct`;

        if (input.type == 'text' && answers[name] && !(iframe.contentDocument.getElementById(span_id))) {
            const input_id = input.id;
            const mq_span = iframe.contentDocument.getElementById(`mq-answer-${input_id}`);
            if (mq_span) {
                mq_span.style.display = 'none';
            }
            label = iframe.contentDocument.getElementById(`${span_id}-label`);
            if (label) {
                label.parentElement.insertBefore(input, label);
                label.remove();
            }
            input.type = "hidden";
            // we need to convert things like &lt; in answers to <
            const correct_ans_text = iframe.contentDocument.createElement('div');
            correct_ans_text.innerHTML = answers[name].correct_ans;
            input.value = correct_ans_text.textContent;
            const show_span = iframe.contentDocument.createElement('span');
            show_span.id = span_id;
            show_span.appendChild(answers[name].correct_ans_latex_string
                ? iframe.contentDocument.createTextNode('\\(' + answers[name].correct_ans_latex_string + '\\)')
                : iframe.contentDocument.createTextNode(answers[name].correct_ans));
            input.parentElement.insertBefore(show_span, input);
        }

        if (input.type.toUpperCase() == 'RADIO' && answers[name]) {
            const correct_ans = answers[name].correct_choice || answers[name].correct_ans;
            if (input.value == correct_ans) {
                input.checked = true;
            } else {
                input.checked = false;
            }
        }

        if (input.type.toUpperCase() == 'CHECKBOX' && answers[name]) {
            const correct_choices = answers[name].correct_choices;
            if (correct_choices.includes(input.value)) {
                input.checked = true;
            } else {
                input.checked = false;
            }
        }
    }

    const hiddenInputs = body.querySelectorAll("input[type=hidden]");
    for (const input of hiddenInputs) {
        const name = input.name;
        if (!input.nextElementSibling) continue;
        const graphtoolContainer = input.nextElementSibling.nextElementSibling;
        if (graphtoolContainer && answers[name] && graphtoolContainer.classList.contains('graphtool-container')) {
            const correct_ans_div = iframe.contentDocument.createElement('div');
            input.parentElement.insertBefore(correct_ans_div, graphtoolContainer);
            graphtoolContainer.style.display = 'none';
            input.value = answers[name].correct_ans;
            iframe.contentWindow.jQuery(correct_ans_div).html(answers[name].correct_ans_latex_string);
            const script = iframe.contentDocument.createElement('script');
            script.textContent = correct_ans_div.querySelector('script').textContent
                .replace('\nwindow.addEventListener("DOMContentLoaded",', '(')
                .replace(/;\n$/, '();');
            iframe.contentDocument.body.appendChild(script);
        }
    }

    let selects = body.querySelectorAll("select:not([type=hidden])");
    for (const select of selects) {
        const name = select.name;
        const span_id = `${ww_id}-${name}-correct`;
        if (answers[name] && !iframe.contentDocument.getElementById(span_id)) {
            select.style.display = "none";
            select.value = answers[name].correct_ans;
            const show_span = iframe.contentDocument.createElement('span');
            show_span.id = span_id;
            show_span.appendChild(answers[name].correct_ans_latex_string
                ? iframe.contentDocument.createTextNode('\\(' + answers[name].correct_ans_latex_string + '\\)')
                : iframe.contentDocument.createTextNode(answers[name].correct_ans));
            select.parentElement.insertBefore(show_span, select);
        }
    }

    // run MathJax on our new rendering
    // FIXME: We only need to typeset the added elements, not the entire body.
    const mathjaxTypesetScript = iframe.contentDocument.createElement('script');
    mathjaxTypesetScript.textContent = 'MathJax.startup.promise.then(() => MathJax.typesetPromise([document.body]));';
    iframe.contentDocument.body.appendChild(mathjaxTypesetScript);
}

function resetWW(ww_id) {
    const ww_container = document.getElementById(ww_id);
    const activate_button = document.getElementById(ww_id + '-button');

    ww_container.dataset.current_seed = ww_container.dataset.seed;

    iframe = ww_container.querySelector('.problem-iframe');
    iframe.remove();

    ww_container.querySelector('.problem-contents').classList.remove('hidden-content', 'hidden');

    ww_container.querySelector('.problem-buttons.webwork').remove();
    ww_container.querySelector('.problem-buttons').classList.remove('hidden-content', 'hidden');
    // if the newer activate button is there (but hidden) bring it back too
    if (activate_button != null) {activate_button.classList.remove('hidden-content', 'hidden');};
}

function adjustSrcHrefs(container,ww_domain) {
    container.querySelectorAll('[href]').forEach((node) => {
        const href = node.attributes.href.value;
        if (href !== '#' && !href.match(/^[a-z]+:\/\//i)) node.href = ww_domain + '/' + href;
    });
    container.querySelectorAll('[data-knowl-url]').forEach((node) => {
        const dku = node.dataset.knowlUrl;
        if (dku !== '#' && !dku.match(/^[a-z]+:\/\//i)) node.dataset.knowlUrl = ww_domain + dku;
    });
    container.querySelectorAll('[src]').forEach((node) => {
        node.src = new URL(node.attributes.src.value, ww_domain).href;
    });
}

function translateHintSol(ww_id, body_div, ww_domain, b_ptx_has_hint, b_ptx_has_solution, hint_label_text, solution_label_text) {
    // The problem text may come with "hint"s and "solution"s
    // Each one is a div.accordion > details.accordion-item > summary.accordion-button
    // Styling is not the PTX way, so we change it to one div.solutions
    // with (potentially multiple) details.born-hidden-knowl > summary.knowl__link
    // Also if hint/sol were missing from the static version, we want these removed here

    const hintSols = body_div.querySelectorAll('.accordion.hint,.accordion.solution');
    if (hintSols.length == 0) {return};

    for (const hintSol of hintSols) {
        const parent = hintSol.parentNode;
        solutionlikewrapper = document.createElement('div');
        solutionlikewrapper.classList.add('solutions');
        parent.insertBefore(solutionlikewrapper, hintSol);

        const hintSolType = hintSol.classList.contains('hint') ? 'hint' : 'solution';

        if ((hintSolType == 'solution' && !b_ptx_has_solution) ||
            (hintSolType == 'hint' && !b_ptx_has_hint))
            continue;

        const knowlDetails = hintSol.getElementsByTagName('details')[0];
        knowlDetails.className = '';
        knowlDetails.classList.add(hintSolType, 'solution-like', 'born-hidden-knowl');
        solutionlikewrapper.appendChild(knowlDetails);

        const knowlSummary = knowlDetails.getElementsByTagName('summary')[0];
        knowlSummary.className = '';
        knowlSummary.classList.add('knowl__link');

        const summaryLabel = knowlSummary.children[0];
        summaryLabel.remove();

        const newLabelSpan = document.createElement('span');
        newLabelSpan.innerHTML = hintSolType == 'hint' ? hint_label_text : solution_label_text;
        knowlSummary.appendChild(newLabelSpan);

        const newLabelPeriod = document.createElement('span');
        newLabelPeriod.innerHTML = '.';
        knowlSummary.appendChild(newLabelPeriod);

        adjustSrcHrefs(knowlDetails, ww_domain);
        hintSol.remove();

        const originalDetailsContent = knowlDetails.getElementsByTagName('div')[0];
        const newDetailsContent = originalDetailsContent.getElementsByTagName('div')[0];
        newDetailsContent.className = '';
        newDetailsContent.classList.add(hintSolType, 'solution-like', 'knowl__content');
        knowlDetails.appendChild(newDetailsContent);
        originalDetailsContent.remove();
    }
}

function cloneAttributes(target, source) {
    [...source.attributes].forEach( attr => { target.setAttribute(attr.nodeName ,attr.nodeValue) });
}

function webworkSeedHash(string) {
    var hash = 0, i, chr;
    if (string.length === 0) return hash;
    for (i = 0; i < string.length; i++) {
        chr   = string.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; //Convert to 32bit integer
    }
    return Math.abs(hash);
};
