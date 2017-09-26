## Using tasker to send coordinates to ioBroker

### Install tasker

Install tasker on your android phone from here: https://play.google.com/store/apps/details?id=net.dinglisch.android.taskerm

### Configure tasker

#### Create task

![Step1](tasker1.png)

![Step2](tasker2.png)

![Step3](tasker3.png)

![Step4](tasker4.png)

![Step5](tasker5.png)

The default settings are ok. Leave it unchanged.

![Step6](tasker6.png)

![Step7](tasker7.png)

![Step8](tasker8.png)

![Step9](tasker9.png)

Write into **server:port** ```https://iobroker.pro``` or ```https://iobroker.net```

Write into **path**  ```/service/custom_position/<app-key>/%LOC``` . You can get the link in the settings of the cloud instance.

![Step10](tasker10.png)

![Step11](tasker11.png)

![Step12](tasker12.png)

After the task is created, test it and the position must appear in admin.

#### Create profile

Run task every 10 minutes.

![Step13](tasker13.png)

![Step14](tasker14.png)

![Step15](tasker15.png)

![Step16](tasker16.png)

![Step17](tasker17.png)

![Step18](tasker18.png)

Check the output.

![Step19](tasker19.png)

You can use the coordinates in map widget. Just do not forget to swap the longitude and latitude.