[![CircleCI](https://circleci.com/gh/danvk/localturk.svg?style=svg)](https://circleci.com/gh/danvk/localturk)

# localturk

Local Turk implements Amazon's Mechanical Turk API on your own machine.

It's handy if you want to:

1. Develop a Mechanical Turk template
2. Do some repetitive tasks on your own, without involving Turkers.

You could use it, for instance, to generate test and training data for a Machine Learning algorithm.

## Quick Start

Install:

    npm install -g localturk

Run:

    cd localturk/sample
    localturk transcribe.html tasks.csv outputs.csv

Then visit http://localhost:4321/ to start Turking.

## Templates and Tasks

Using Local Turk is just like using Amazon's Mechanical Turk. You create:

1. An HTML template file with a &lt;form&gt;
2. A CSV file of tasks

For example, say you wanted to record whether some images contained a red ball. You would make a CSV file containing the URLs for each image:

    image_url
    http://example.com/image_with_red_ball.png
    http://example.com/image_without_red_ball.png

Then you'd make an HTML template for the task:

```html
<img src="${image_url}" />
<input type=radio name=has_button value="yes" /> Has a red ball<br/>
<input type=radio name=has_button value="no" /> Does not have a red ball<br/>
```

Finally, you'd start up the Local Turk server:

    $ localturk path/to/template.html path/to/tasks.csv path/to/output.csv

Now you can visit http://localhost:4321/ to complete each task. When you're done, the output.csv file will contain

    image_url,has_button
    http://example.com/image_with_red_ball.png,yes
    http://example.com/image_without_red_ball.png,no

## Image Classification

The use case described above (classifying images) is an extremely common one.

To expedite this, localturk provides a separate script for doing image
classification. The example above could be written as:

    classify-images --labels 'Has a red ball,Does not have a red ball' *.png

This will bring up a web server with a UI for assigning one of those two labels
to each image on your local file system. The results will go in `output.csv`.

For more details, run `classify-images --help`.

## Tips & Tricks

It can be hard to remember the exact format for template files. localturk can help! Run it with
the `--write-template` argument to generate a template file for your input that you can edit:

    localturk --write-template tasks.csv > template.html

When you're going through many tasks, keyboard shortcuts can speed things up tremendously.
localturk supports these via the `data-key` attribute on form elements. For example, make yourer
submit button look like this:

    <input type="submit" name="result" value="Good" data-key="d">

Now, when you press `d`, it'll automatically click the "Good" button for you. _Note that this
feature is not available on mechanical turk itself!_

If you'd like to reference sensitive data that you'd prefer not to commit to your repo
(an API key, say), you can pass it via a command-line parameter:

    localturk --var API_KEY=123456abcd

Then you can reference this as `${API_KEY}` in your template file.

## Development

To make changes to localturk, clone it and set it up using `yarn`:

    yarn

You can run `localturk.ts` or `classify-images.ts` directly using `ts-node`:

    ts-node localturk.ts path/to/template.html path/to/tasks.csv path/to/output.csv

To type check and run the tests:

    yarn tsc
    yarn test

To publish a new version on npm, run:

    yarn tsc
    yarn publish
