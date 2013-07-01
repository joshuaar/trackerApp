#! /bin/bash
if [ $# -lt 1 ]; then
        ip="192.168.1.1"
else
        ip=$1
fi

curl --data "IP=$ip" smaugshideout.com:3000/u/default
