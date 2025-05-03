#!/bin/bash

(cd app/backend && python ./app.py) &
(cd app/frontend && npm start)