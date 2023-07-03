
from selenium import webdriver
from selenium.webdriver.common.by import By
import openpyxl
import time

#For chatbox
#use chatbox website version

#Name of your excel location
workbook = openpyxl.load_workbook('origin.xlsx')
sheet = workbook.active



driver = webdriver.Chrome()

# open website
driver.get('https://web.chatboxai.app/')
time.sleep(40)  # give your 40 second to enter your apikey
# The XPATH of input button and the send button
#If you need to apply the code in other website
# rather than ChatBox https://web.chatboxai.app/,u just need to change this two line
input_box = driver.find_element(By.XPATH,'//*[@id="message-input"]')
send_button = driver.find_element(By.XPATH,'//*[@id="root"]/div/div/div[2]/div/div[3]/form/div/div/div[2]/button')

#The prompt is in A line
f_column = sheet['A']
#The 0 is the Header of excel,the 1 is the first prompt
#And the range function is "Left-closed, right-open",
#Such as (1,3) is 1,2 without 3
#Summary: If you want to auto prompt from the 2 line(if 1 line is the Header) to 40 line,need to use for i in range(1,40)
#It's not difficult,just try!
for i in range(1, 5):
    input_box.send_keys(f_column[i].value)
    send_button.click()
    time.sleep(30)  # 等待30秒钟
    answers=driver.find_elements(By.XPATH,'//*[@class="MuiGrid-root MuiGrid-container MuiGrid-item MuiGrid-grid-xs-true MuiGrid-grid-sm-true css-13jrxdu"]/div/div[1]')
   #找到最新的这个answer
    recent_answer=answers[-1].text
    print("The answer {} is".format(i),recent_answer)
    #A is 1,B is 2
    sheet.cell(row=i + 1, column=2).value = recent_answer
#You can change the output file location
workbook.save('prompt_comletions.xlsx')
#You can use the answers if you have other require,it's the list of answers,
#anwers[1].text is the first answer
print("The answers are",answers)
#Give you one hour  to see the answer,you can exit by yourself if you don't need to compare the answer betweeen website and xlsx
time.sleep(3600)
# close chrome
driver.quit()
