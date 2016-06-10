# common

## Usage
``` js
  var winston = require('winston');

  //
  // Requiring `winston-mailer` will expose
  // `winston.transports.Mail`
  //
  require('winston-mailer').Mail;
  winston.add(winston.transports.Mail, options);
  winston.add(require('winston-rotate-file'), options)
```

The Mail transport uses [mailer](http://github.com/Marak/node_mailer.git) behind the scenes.  Options are the following:

* __to:__ The address(es) you want to send to. *[required]*
* __from:__ The 'from' address (default: `winston@[server-host-name].com`)
* __host:__ SMTP server hostname (default: localhost)
* __port:__ SMTP port (default: 587 or 25)
* __username__ User for server auth
* __password__ Password for server auth
* __level:__ Level of messages that this transport should log.
* __silent:__ Boolean flag indicating whether to suppress output.
* __prefix:__ String for using in as prefix in the subject.
* __maxBufferItems__ Max errors that will be buffered (default 100)
* __maxBufferTimeSpan__ Max miliseconds errors will be buffered (default 60000)


The RotateFile transport can rotate files by minute, hour, day, month or year. In addition to the options accepted by the File transport, the Rotate File Transport also accepts the following options:

* __datePattern:__ A string representing the pattern to be used when appending the date to the filename (default '.yyyy-MM-dd'). The meta characters used in this string will dictate the frequency of the file rotation. For example, if your datePattern is simply '.HH' you will end up with 24 log files that are picked up and appended to every day.
* __prepend:__ Defines if the rolling time of the log file should be prepended at the begging of the filename (default `false`)
* __preserveExt:__ Defines if the rolling time of the log file should be appended to the filename while preserving the file extension (default `false`)

Valid meta characters in the datePattern are:

* __yy:__ Last two digits of the year.
* __yyyy:__ Full year.
* __M:__ The month.
* __MM:__ The zero padded month.
* __d:__ The day.
* __dd:__ The zero padded day.
* __H:__ The hour.
* __HH:__ The zero padded hour.
* __m:__ The minute.
* __mm:__ The zero padded minute.

*Metadata:* Logged via util.inspect(meta);
