#!/bin/bash
IFS="
"
for line in `cat -`;do

a= curl -GET smaugshideout.com:3000/u/default/$line
echo $a
done
