import React, { useState, useEffect }from 'react';
import { View, Text, Image, TextInput, Pressable, StyleSheet, ScrollView, Button } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import * as SQLite from "expo-sqlite";
import * as WebBrowser from 'expo-web-browser';

SplashScreen.preventAutoHideAsync();
setTimeout(SplashScreen.hideAsync, 2000);

const homeImage = require("./assets/images/house.png");

// Source: https://stackoverflow.com/questions/149055/how-to-format-numbers-as-currency-strings
const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function formatCurrency(value) {
  return formatter.format(value);
}

function formatPercentage(value) {
  return value.toString() + "%";
}

function openDatabase() {
  if (Platform.OS === "web") {
    return {
      transaction: () => {
        return {
          executeSql: () => {},
        };
      },
    };
  }

  const db = SQLite.openDatabase("db.db");
  return db;
}

const db = openDatabase();

function Results() {
  const [results, setResults] = useState(null);

  useEffect(() => {
    db.transaction((tx) => {
      tx.executeSql(
        `select * from calculations order by id desc;`,
        null,
        (_, { rows: { _array } }) => setResults(_array)
      );
    });
  }, []);

  if (results === null || results.length === 0) {
    return null;
  }

  return (
    <View> 
      {results.map(({ loanAmount, result, calcDate }) => (
        <Result loanAmount={loanAmount} result={result} calcDate={calcDate} />
      ))}
    </View>
  )
}

function Result({loanAmount, result, calcDate}){
  return (
    <View style={styles.historyRow}>
      <Text style={styles.historyDate}>{calcDate}</Text>
      <Text style={styles.historyAmount}>{formatCurrency(loanAmount)}</Text>
      <Text style={styles.historyResult}>{formatCurrency(result)}</Text>
    </View>
  );
}

function HomeScreen({ navigation }) {
  const [loanAmount, setLoanAmount] = useState(null);
  const [interestRate, setInterestRate] = useState(null);
  const [loanLength, setLoanLength] = useState(null);
  const [forceUpdate, forceUpdateId] = useForceUpdate();
  const result = null;

  function isValid() {
    if(isNaN(loanAmount)){
      alert("Loan Amount must be only numeric characters");
      return false;
    }else if(loanAmount < 50000){
      alert("Loan Amount must be greater than $50,000");
      return false;
    }else if(isNaN(interestRate)){
      alert("Interest Rate must be whole number");
      return false;
    }else if(interestRate <= 0 || interestRate > 100){
      alert("Interest Rate must be greater than 0% and lesser than 100%");
      return false;
    }else if(isNaN(loanLength)){
      alert("Loan Length must be a whole number");
      return false;
    }else if(loanLength <= 0 || loanLength > 30){
      alert("Loan Length must be greater than 0 and lesser than or equal to 30 years");
      return false;
    }
    let i = (interestRate*0.01)/12;
    let n = loanLength*12;
    const result = loanAmount * (i * (1 + i) ** n) / ((1 + i) ** n - 1);
    let calcResult = {
      amount: formatCurrency(loanAmount),
      interestRate: formatPercentage(interestRate),
      length: loanLength + " Years",
      result: formatCurrency(result)
    };

    try {
      add(result);
      navigation.navigate('Result', {result: calcResult});
    } catch (error) {
      alert('There was an error while saving the data');
    }
    return true;
  }

  useEffect(() => {
    db.transaction((tx) => {
      tx.executeSql(
        "create table if not exists calculations (id integer primary key not null, loanAmount real, result real, calcDate real);"
      );
    });
  }, []);

  const add = (result) => {
    db.transaction(
      (tx) => {
        tx.executeSql("insert into calculations (loanAmount, result, calcDate) values (?, ?, date('now'))", [loanAmount, result]);
        tx.executeSql(`select id, loanAmount, result, date(calcDate) as calcDate from calculations order by id desc;`, [], (_, { rows }) =>
          console.log(JSON.stringify(rows))
        );
      },
      null,
      forceUpdate
    );
  };

  return (
    <View style={styles.container}>
      <Image style={styles.elementContainer} source={homeImage} />
      <View style={styles.elementContainer}>
        <Text style={styles.resultLabel}>Loan Amount</Text>
        <TextInput style={styles.input} placeholder={"Loan Amount"}
          onChangeText={newText => setLoanAmount(newText)}
        />
        <Text style={styles.resultLabel}>Interest Rate as Percent</Text>
        <TextInput style={styles.input} placeholder={"Interest Rate"}
          onChangeText={newText => setInterestRate(newText)}
         />
         <Text style={styles.resultLabel}>Loan Length in Years</Text>
        <TextInput style={styles.input} placeholder={"Loan Length in Years"}
          onChangeText={newText => setLoanLength(newText)}
         />
      </View>
      <View style={styles.buttonContainer}>
        <Pressable 
          onPress={() => isValid()}
        >
          <Text style={styles.buttonText}>Calculate</Text>
        </Pressable>
      </View>
      <View style={styles.linkContainer}>
        <Button
          title="Shop for Homes on Zillow"
          onPress={() => WebBrowser.openBrowserAsync('https://www.zillow.com')}
          style={styles.button}
        />
      </View>
    </View>
  );
}

function ResultScreen({ route, navigation }) {
  const {result} = route.params;
  const [forceUpdate, forceUpdateId] = useForceUpdate();

  return (
    <View style={styles.container}>
      <View style={styles.resultHeader}>
        <Text style={styles.title}>Results</Text>
      </View>
      <View style={styles.resultContainer}>
        <Text style={styles.resultLabel}>Loan Amount</Text>
        <TextInput value={result.amount} editable={false} style={styles.input} />
        <Text style={styles.resultLabel}>Interest Rate</Text>
        <TextInput value={result.interestRate} editable={false} style={styles.input} />
        <Text style={styles.resultLabel}>Length of Loan</Text>
        <TextInput value={result.length} editable={false} style={styles.input} />
        <Text style={styles.resultLabel}>Monthly Payment Amount</Text>
        <TextInput value={result.result} editable={false} style={styles.input} />
      </View>
      <View style={styles.historyContainer}>
        <Text style={styles.historyHeader}>Calculation History</Text>
        <View style={styles.historyRow}>
          <Text style={styles.historyDate}>Date</Text>
          <Text style={styles.historyAmount}>Amount</Text>
          <Text style={styles.historyResult}>Result</Text>
        </View>
        <ScrollView>
          <Results key={forceUpdateId}/>
        </ScrollView>
      </View>
    </View>
  );
}

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName='Home'
        screenOptions={{
          title: 'Mortgage Calculator',
            headerStyle: {
              backgroundColor: 'blue'
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontSize: 25
            }
        }}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function useForceUpdate() {
  const [value, setValue] = useState(0);
  return [() => setValue(value + 1), value];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  title: {
    fontSize: 45,
    textAlign: 'center',
    color: "#000",
  },
  elementContainer: {
    marginVertical: 10,
  },
  linkContainer: {
    marginTop: 20
  },
  historyContainer: {
    borderTopColor: '#000',
    borderTopWidth: 1,
    width: '90%',
    height: 300,
    marginVertical: 10,
    paddingVertical: 10,
  },
  historyHeader: {
    fontSize: 25,
  },
  historyRow: {
    borderBottomColor: '#000',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 5
  },
  historyDate: {
    flex: 1,
    fontSize: 18,
  },
  historyAmount: {
    flex: 1,
    fontSize: 18,
  },
  historyResult: {
    flex: 1,
    fontSize: 18,
  },
  input: {
     height: 40,
     fontSize: 20,
     textAlign: 'center',
     borderWidth: 1,
     margin: 5,
     width: 300,
     borderRadius: 10,
     textAlign: 'left',
     paddingHorizontal: 5,
     backgroundColor: '#ebedee',
  },
  buttonContainer: {
    backgroundColor: "lightblue",
    marginVertical: 10,
    width: 200,
    paddingVertical: 5,
  },
  buttonText: {
    fontSize: 20,
    color: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 10,
    textAlign: 'center',
    fontWeight: 'bold'
  },
  resultHeader: {
    marginVertical: 10,
    borderBottomColor: '#000',
    borderBottomWidth: 1,
    width: '90%',
    height: '10%',
  },
  resultContainer: {
    marginHorizontal: 5,
    marginVertical: 20,
    
  },
  resultLabel: {
    fontSize: 18,
    marginHorizontal: 5,
  }
});
