# Contributing to MarkLogic State Conductor

MarkLogic State Conductor welcomes new contributors. This document will guide you through the process.

 - [Code Explanation](#explanation-of-the-code)
 - [Issues and Bugs](#found-an-issue)
 - [Feature Requests](#want-a-feature)
 - [Building from Source](#building-markLogic-state-conductor-from-source)
 - [Submission Guidelines](#submission-guidelines)

## Explanation of the code
There are two sub-projects. 

State-conductor-modules which contains the core library that gets built into the mlBundle redistributable.

State-conductor-example which had unit tests, as well as example flows and actions.

## Found an Issue?
If you find a bug in the source code or a mistake in the documentation, you can help us by submitting an issue to our [GitHub Issue Tracker][issue tracker]. Even better, you can submit a Pull Request with a fix for the issue you filed.


## Want a Feature?
You can request a new feature by submitting an issue to our [GitHub Issue Tracker][issue tracker].  If you
would like to implement a new feature then first create a new issue and discuss it with one of our
project maintainers.

## Building MarkLogic State Conductor from Source
Looking to build the code from source? 

#### Prerequisites
You need:

- MarkLogic 9.0-10 or later
- Gradle 4.6 or later
- Java JDK 8 or later
- A decent IDE. (Recommended: Visual Studio Code)

#### Building from the command line

```bash
cd into state-conductor-modules
gradle modulesJar publishToMavenLocal
cd into state-conductor-example
gradle mldeploy
```
**Note:**
Create a gradle-local.properties in the state-conductor-example folder that has the mlPassword set or pass the mlPassword in on the mldeploy command

```bash
gradle mldeploy -PmlPassword=[passwordHere]
```

This builds and locally publishes the state conductor, and then deploys the example project with your changes  

In your Example project's `build.gradle` file, enter the local version:

  ```groovy

  // this goes at the top above the plugins section

  buildscript {
	repositories {
		jcenter()
		mavenLocal()
	}
	dependencies {
		classpath "com.marklogic:marklogic-unit-test-client:1.0.0"
		classpath "com.marklogic:ml-gradle:3.16.1"
	}
}

plugins {
  id "java"
  id "net.saliman.properties" version "1.5.1"
  id "com.marklogic.ml-gradle" version "3.16.1"
}

repositories {
	jcenter()
	mavenLocal()
}

dependencies {
	mlBundle "com.marklogic:marklogic-state-conductor:(you pick your local version number)"  
	mlBundle "com.marklogic:marklogic-unit-test-modules:1.0.0"
}
  ```

**Note**: This change goes in a state-conductor-example project's `build.gradle`. Not the state-conductor-modules source code's build.gradle.

### Troubleshooting

If the `gradle runui` command fails, try the following to troubleshoot.


#### Do you have Gradle 3.4 or newer?

Using gradle directly:
  ```
  gradle -v
  ```
or if you are using the wrapper:
  ```
  ./gradlew -v
  ```

If your gradle wrapper is older than `3.4`:
  ```
  gradle wrapper --gradle-version 3.4
  ```


#### Are you on the develop branch?

_Hint: You should be._

To check:
  ```bash
  git branch
  ```

To switch to the develop branch:
  ```bash
  git checkout develop
  ```


#### Do you have the latest code?

  Better make sure...

##### cloned your fork:

  1. Make sure you have the upstream files:

      ```bash
      $ git remote add upstream https://github.com/aclavio/marklogic-state-conductor.git
      ```

  2. Fetch the upstream files:

      ```bash
      git fetch upstream develop
      ```

  3. Merge it:

      ```bash
      git rebase upstream/develop
      ```

## Submission Guidelines


### Submitting an Issue

Before you submit your issue, search the archive to check if your question has been answered.

If your issue appears to be a bug and hasn't been reported, open a new issue.

By not reporting duplicate issues, you help us maximize the time we spend fixing issues and adding new features.

Please fill out the issue template so that your issue can be dealt with quickly.


### Submitting a Pull Request

#### Fork markLogic-state-conductor-from-source

Fork the project [on GitHub](https://github.com/aclavio/marklogic-state-conductor/fork) and clone your copy.

  ```sh
  $ git clone git@github.com:username/markLogic-state-conductor-from-source.git
  $ cd markLogic-state-conductor-from-source
  $ git remote add upstream git://github.com/aclavio/marklogic-state-conductor/.git
  ```

**Important:** Please open an issue in the [issue tracker][] and get your proposed changes pre-approved by at least one of the project maintainers before you start coding. Nothing is more frustrating than seeing your hard work go to waste because your vision does not align with that of the project maintainers.


#### Create a branch for your changes

If you decide to fix something, create a feature branch and start hacking.

**Note:** We use `git flow` and our most recent changes live on the `develop` branch.

  ```sh
  $ git checkout -b my-feature-branch -t origin/develop
  ```


#### Formatting code

We use `[.editorconfig][]` to configure our editors for proper code formatting. If you don't
use a tool that supports editorconfig, be sure to configure your editor to use the settings
equivalent to our .editorconfig file.


#### Commit your changes

Make sure git knows your name and email address:

  ```sh
  $ git config --global user.name "J. Random User"
  $ git config --global user.email "j.random.user@example.com"
  ```

Writing good commit logs is important. A commit log should describe what
changed and why. Follow these guidelines when writing one:

1. The first line should be 50 characters or less and contain a short
   description of the change including the issue number prefixed by a hash (#).
2. Keep the second line blank.
3. Wrap all other lines at 72 columns.

Example of a good commit log:

```
Fixing Issue #123: make the whatchamajigger work in MarkLogic 9

Body of commit message is a few lines of text, explaining things
in more detail, possibly giving some background about the issue
being fixed, etc.

The body of the commit message can be several paragraphs, and
please do proper word-wrap and keep columns shorter than about
72 characters or so. That way `git log` will show things
nicely even when it is indented.
```

The header line should be meaningful; it is what other people see when they
run `git shortlog` or `git log --oneline`.


#### Rebase your repo

Use `git rebase` (not `git merge`) to sync your work from time to time.

  ```sh
  $ git fetch upstream
  $ git rebase upstream/develop
  ```


#### Test your code

- Run the JUnit tests.

  ```sh
  $ ./gradlew test
  ```

- To run a single test:

  ```sh
  $ ./gradlew -Dtest.single=TestName test
  ```

- For best results, do not include the final word test. For example, suppose you want to run FlowRunnerTest:

  ```sh
  $ ./gradlew -Dtest.single=FlowRunner test
  ```

You can run the e2e tests from Visual Studio Code or another IDE to perform fullstack debugging. To do so, add a run/debug
**IMPORTANT: All submitted patches must pass ALL tests.**

#### Push your changes

  ```sh
  $ git push origin my-feature-branch
  ```

#### Submit the pull request

Go to https://github.com/username/marklogic-state-conductor and select your feature branch. Click
the 'Pull Request' button and fill out the form.

Pull requests are usually reviewed within a few days. If you get comments
that need to be to addressed, apply your changes in a separate commit and push that to your
feature branch. Post a comment in the pull request afterwards; GitHub does
not send out notifications when you add commits to existing pull requests.

That's it! Thank you for your contribution!


#### After your pull request is merged

After your pull request is merged, you can safely delete your branch and pull the changes
from the main (upstream) repository:

* Delete the remote branch on GitHub either through the GitHub web UI or your local shell as follows:

    ```shell
    git push origin --delete my-feature-branch
    ```

* Check out the develop branch:

    ```shell
    git checkout develop -f
    ```

* Delete the local branch:

    ```shell
    git branch -D my-feature-branch
    ```

* Update your develop with the latest upstream version:

    ```shell
    git pull --ff upstream develop
    ```

[issue tracker]: https://github.com/aclavio/marklogic-state-conductor/issues
[.editorconfig]: http://editorconfig.org/
